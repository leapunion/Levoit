"""Scrape orchestrator — dispatches scrapes across platforms with concurrency control.

Responsibilities:
  - Expand VisQuery list into query × platform task matrix
  - Dedup via Redis key (dedup:{query_id}:{platform}, TTL 6h) per R-DC-05
  - Acquire rate limit before each scrape
  - Limit concurrency per platform with asyncio.Semaphore(3)
  - Collect results, record failures, never block the pipeline per R-DC-07
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

from redis.asyncio import Redis

from src.models.enums import Platform
from src.models.scrape_models import ProcessedContent
from src.services.scraper.base import AbstractPlatformScraper
from src.services.scraper.rate_limiter import PlatformRateLimiter

logger = logging.getLogger(__name__)

# Dedup key TTL: 6 hours (prevent same query+platform re-scrape)
DEDUP_TTL_SECONDS = 6 * 3600

# Max concurrent scrapes per platform
MAX_CONCURRENT_PER_PLATFORM = 3

# Rate limit acquire timeout per task
RATE_LIMIT_TIMEOUT = 120.0


@dataclass
class ScrapeFailure:
    """Record of a failed scrape attempt."""

    query_id: int
    query_text: str
    platform: Platform
    error_type: str
    error_detail: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class OrchestratorResult:
    """Aggregated results from a batch scrape run."""

    successes: list[tuple[int, Platform, ProcessedContent]] = field(default_factory=list)
    failures: list[ScrapeFailure] = field(default_factory=list)
    skipped_dedup: int = 0
    skipped_rate_limit: int = 0

    @property
    def total_tasks(self) -> int:
        return len(self.successes) + len(self.failures) + self.skipped_dedup + self.skipped_rate_limit

    @property
    def success_count(self) -> int:
        return len(self.successes)

    @property
    def failure_count(self) -> int:
        return len(self.failures)


@dataclass
class _ScrapeTask:
    """Internal: a single query × platform scrape task."""

    query_id: int
    query_text: str
    platform: Platform
    brands: list[str]


class ScrapeOrchestrator:
    """Dispatches and manages concurrent scrape tasks across platforms."""

    def __init__(
        self,
        scrapers: dict[Platform, AbstractPlatformScraper],
        rate_limiter: PlatformRateLimiter,
        redis: Redis,
    ) -> None:
        self._scrapers = scrapers
        self._rate_limiter = rate_limiter
        self._redis = redis
        # Per-platform semaphores for concurrency control
        self._semaphores: dict[Platform, asyncio.Semaphore] = {
            p: asyncio.Semaphore(MAX_CONCURRENT_PER_PLATFORM)
            for p in Platform
        }

    async def run(
        self,
        queries: list[dict],
        platforms: list[Platform] | None = None,
    ) -> OrchestratorResult:
        """Execute scrapes for all query × platform combinations.

        Args:
            queries: List of query dicts with keys: id, query_text, brands.
            platforms: Platforms to scrape. Defaults to all configured scrapers.

        Returns:
            OrchestratorResult with successes, failures, and skip counts.
        """
        target_platforms = platforms or list(self._scrapers.keys())
        result = OrchestratorResult()

        # Build task matrix: query × platform
        tasks: list[_ScrapeTask] = []
        for q in queries:
            for platform in target_platforms:
                if platform not in self._scrapers:
                    continue
                tasks.append(_ScrapeTask(
                    query_id=q["id"],
                    query_text=q["query_text"],
                    platform=platform,
                    brands=q.get("brands", []),
                ))

        logger.info("Orchestrator: %d tasks (%d queries × %d platforms)",
                     len(tasks), len(queries), len(target_platforms))

        # Execute all tasks concurrently (bounded by per-platform semaphores)
        coros = [self._execute_task(task, result) for task in tasks]
        await asyncio.gather(*coros)

        logger.info(
            "Orchestrator complete: %d success, %d failed, %d dedup-skipped, %d rate-limited",
            result.success_count,
            result.failure_count,
            result.skipped_dedup,
            result.skipped_rate_limit,
        )
        return result

    async def _execute_task(self, task: _ScrapeTask, result: OrchestratorResult) -> None:
        """Execute a single scrape task with dedup, rate limit, and concurrency control."""
        # 1. Check dedup
        dedup_key = f"dedup:{task.query_id}:{task.platform.value}"
        if await self._redis.exists(dedup_key):
            logger.debug("Dedup skip: query=%d platform=%s", task.query_id, task.platform)
            result.skipped_dedup += 1
            return

        # 2. Acquire rate limit
        acquired = await self._rate_limiter.wait_and_acquire(
            task.platform.value, timeout=RATE_LIMIT_TIMEOUT
        )
        if not acquired:
            logger.warning("Rate limit timeout: query=%d platform=%s", task.query_id, task.platform)
            result.skipped_rate_limit += 1
            return

        # 3. Execute with per-platform semaphore
        semaphore = self._semaphores[task.platform]
        async with semaphore:
            try:
                scraper = self._scrapers[task.platform]
                processed = await scraper.scrape(task.query_text)

                # Mark dedup key (TTL 6h)
                await self._redis.set(dedup_key, "1", ex=DEDUP_TTL_SECONDS)

                result.successes.append((task.query_id, task.platform, processed))
                logger.debug("Success: query=%d platform=%s", task.query_id, task.platform)

            except Exception as e:
                error_type = type(e).__name__
                error_detail = str(e)[:500]
                result.failures.append(ScrapeFailure(
                    query_id=task.query_id,
                    query_text=task.query_text,
                    platform=task.platform,
                    error_type=error_type,
                    error_detail=error_detail,
                ))
                logger.error(
                    "Scrape failed: query=%d platform=%s error=%s: %s",
                    task.query_id, task.platform, error_type, error_detail,
                )

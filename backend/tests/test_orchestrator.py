"""Tests for ScrapeOrchestrator — concurrency, dedup, rate limiting, failure handling."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import fakeredis.aioredis
import pytest

from src.models.enums import Platform
from src.models.scrape_models import ProcessedContent, QuarantineError
from src.services.scraper.orchestrator import (
    DEDUP_TTL_SECONDS,
    ScrapeOrchestrator,
)
from src.services.scraper.rate_limiter import PlatformRateLimiter


# ── Fixtures ─────────────────────────────────────────────────


def _make_processed(query: str, platform: str) -> ProcessedContent:
    return ProcessedContent(
        clean_text=f"Results for {query} on {platform}: Levoit Core 300S is great.",
        content_hash=f"hash_{query}_{platform}",
        char_count=60,
        url=f"https://{platform}.com/search?q={query}",
        status_code=200,
        scraped_at=datetime(2026, 2, 10, tzinfo=timezone.utc),
    )


def _make_scraper(platform: Platform, succeed: bool = True, error: Exception | None = None):
    """Create a mock scraper that either succeeds or fails."""
    scraper = AsyncMock()
    scraper.platform = platform
    if succeed and error is None:
        scraper.scrape.side_effect = lambda q: _make_processed(q, platform.value)
    else:
        scraper.scrape.side_effect = error or Exception("scrape failed")
    return scraper


def _make_queries(count: int = 2) -> list[dict]:
    return [
        {"id": i + 1, "query_text": f"best air purifier query {i + 1}", "brands": ["Levoit", "Dyson"]}
        for i in range(count)
    ]


@pytest.fixture
def redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def rate_limiter(redis):
    rl = PlatformRateLimiter(redis)
    # High limits so tests don't hit rate limiting unless intended
    rl._limits = {"chatgpt": 100, "perplexity": 100, "google_ai": 100}
    return rl


@pytest.fixture
def scrapers():
    return {
        Platform.chatgpt: _make_scraper(Platform.chatgpt),
        Platform.perplexity: _make_scraper(Platform.perplexity),
        Platform.google_ai: _make_scraper(Platform.google_ai),
    }


@pytest.fixture
def orchestrator(scrapers, rate_limiter, redis):
    return ScrapeOrchestrator(scrapers=scrapers, rate_limiter=rate_limiter, redis=redis)


# ── Test: basic execution ────────────────────────────────────


class TestBasicExecution:
    @pytest.mark.asyncio
    async def test_runs_all_query_platform_combinations(self, orchestrator, scrapers) -> None:
        queries = _make_queries(2)
        result = await orchestrator.run(queries)

        # 2 queries × 3 platforms = 6 tasks
        assert result.success_count == 6
        assert result.failure_count == 0
        assert result.total_tasks == 6

    @pytest.mark.asyncio
    async def test_runs_subset_of_platforms(self, orchestrator) -> None:
        queries = _make_queries(2)
        result = await orchestrator.run(queries, platforms=[Platform.chatgpt])

        # 2 queries × 1 platform = 2 tasks
        assert result.success_count == 2
        assert result.total_tasks == 2

    @pytest.mark.asyncio
    async def test_success_tuples_have_correct_structure(self, orchestrator) -> None:
        queries = _make_queries(1)
        result = await orchestrator.run(queries, platforms=[Platform.chatgpt])

        assert len(result.successes) == 1
        query_id, platform, processed = result.successes[0]
        assert query_id == 1
        assert platform == Platform.chatgpt
        assert isinstance(processed, ProcessedContent)
        assert "Levoit" in processed.clean_text


# ── Test: dedup ──────────────────────────────────────────────


class TestDedup:
    @pytest.mark.asyncio
    async def test_dedup_prevents_duplicate_scrape(self, orchestrator, redis) -> None:
        queries = _make_queries(1)

        # First run: succeeds
        r1 = await orchestrator.run(queries, platforms=[Platform.chatgpt])
        assert r1.success_count == 1
        assert r1.skipped_dedup == 0

        # Second run: dedup-skipped
        r2 = await orchestrator.run(queries, platforms=[Platform.chatgpt])
        assert r2.success_count == 0
        assert r2.skipped_dedup == 1

    @pytest.mark.asyncio
    async def test_dedup_key_set_with_ttl(self, orchestrator, redis) -> None:
        queries = _make_queries(1)
        await orchestrator.run(queries, platforms=[Platform.chatgpt])

        key = "dedup:1:chatgpt"
        assert await redis.exists(key)
        ttl = await redis.ttl(key)
        assert ttl > 0
        assert ttl <= DEDUP_TTL_SECONDS

    @pytest.mark.asyncio
    async def test_different_platforms_not_deduped(self, orchestrator) -> None:
        queries = _make_queries(1)

        r1 = await orchestrator.run(queries, platforms=[Platform.chatgpt])
        assert r1.success_count == 1

        # Different platform should still run
        r2 = await orchestrator.run(queries, platforms=[Platform.perplexity])
        assert r2.success_count == 1
        assert r2.skipped_dedup == 0


# ── Test: rate limiting ──────────────────────────────────────


class TestRateLimiting:
    @pytest.mark.asyncio
    async def test_rate_limit_timeout_skips_task(self, scrapers, redis) -> None:
        rl = PlatformRateLimiter(redis)
        rl._limits = {"chatgpt": 1, "perplexity": 100, "google_ai": 100}
        orch = ScrapeOrchestrator(scrapers=scrapers, rate_limiter=rl, redis=redis)

        queries = _make_queries(3)

        # Patch wait_and_acquire to simulate timeout after first acquire
        original_wait = rl.wait_and_acquire
        call_count = 0

        async def limited_wait(platform, timeout=120.0):
            nonlocal call_count
            if platform == "chatgpt":
                call_count += 1
                if call_count > 1:
                    return False  # Simulate rate limit timeout
            return await original_wait(platform, timeout=0.01)

        rl.wait_and_acquire = limited_wait  # type: ignore[assignment]

        result = await orch.run(queries, platforms=[Platform.chatgpt])
        assert result.success_count == 1
        assert result.skipped_rate_limit == 2


# ── Test: failure handling ───────────────────────────────────


class TestFailureHandling:
    @pytest.mark.asyncio
    async def test_failure_does_not_block_other_tasks(self, rate_limiter, redis) -> None:
        scrapers = {
            Platform.chatgpt: _make_scraper(Platform.chatgpt, succeed=False, error=Exception("network error")),
            Platform.perplexity: _make_scraper(Platform.perplexity, succeed=True),
        }
        orch = ScrapeOrchestrator(scrapers=scrapers, rate_limiter=rate_limiter, redis=redis)
        queries = _make_queries(1)

        result = await orch.run(queries)

        assert result.success_count == 1  # perplexity succeeded
        assert result.failure_count == 1  # chatgpt failed
        assert result.failures[0].platform == Platform.chatgpt
        assert result.failures[0].error_type == "Exception"
        assert "network error" in result.failures[0].error_detail

    @pytest.mark.asyncio
    async def test_quarantine_error_recorded_as_failure(self, rate_limiter, redis) -> None:
        scrapers = {
            Platform.chatgpt: _make_scraper(
                Platform.chatgpt,
                succeed=False,
                error=QuarantineError("empty_content", "no content"),
            ),
        }
        orch = ScrapeOrchestrator(scrapers=scrapers, rate_limiter=rate_limiter, redis=redis)
        queries = _make_queries(1)

        result = await orch.run(queries, platforms=[Platform.chatgpt])

        assert result.failure_count == 1
        assert result.failures[0].error_type == "QuarantineError"

    @pytest.mark.asyncio
    async def test_multiple_failures_all_recorded(self, rate_limiter, redis) -> None:
        scrapers = {
            Platform.chatgpt: _make_scraper(Platform.chatgpt, succeed=False, error=Exception("fail1")),
            Platform.perplexity: _make_scraper(Platform.perplexity, succeed=False, error=Exception("fail2")),
        }
        orch = ScrapeOrchestrator(scrapers=scrapers, rate_limiter=rate_limiter, redis=redis)
        queries = _make_queries(2)

        result = await orch.run(queries)

        # 2 queries × 2 failing platforms = 4 failures
        assert result.failure_count == 4
        assert result.success_count == 0


# ── Test: concurrency ────────────────────────────────────────


class TestConcurrency:
    @pytest.mark.asyncio
    async def test_max_concurrent_per_platform(self, rate_limiter, redis) -> None:
        """Verify that at most MAX_CONCURRENT_PER_PLATFORM=3 run simultaneously."""
        import asyncio

        max_concurrent = 0
        current_concurrent = 0
        lock = asyncio.Lock()

        async def tracked_scrape(query: str) -> ProcessedContent:
            nonlocal max_concurrent, current_concurrent
            async with lock:
                current_concurrent += 1
                max_concurrent = max(max_concurrent, current_concurrent)
            await asyncio.sleep(0.01)  # Simulate work
            async with lock:
                current_concurrent -= 1
            return _make_processed(query, "chatgpt")

        scraper = AsyncMock()
        scraper.platform = Platform.chatgpt
        scraper.scrape.side_effect = tracked_scrape

        scrapers = {Platform.chatgpt: scraper}
        orch = ScrapeOrchestrator(scrapers=scrapers, rate_limiter=rate_limiter, redis=redis)

        queries = _make_queries(6)
        result = await orch.run(queries, platforms=[Platform.chatgpt])

        assert result.success_count == 6
        assert max_concurrent <= 3

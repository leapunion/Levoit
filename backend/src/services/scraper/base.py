"""Abstract base class for platform scrapers (Strategy Pattern).

Each platform scraper implements:
  - build_search_url(query) → platform-specific URL
  - scrape(query) → call Firecrawl, store snapshot, process, return ProcessedContent

Retry logic: 3x with exponential backoff (5s, 15s, 45s) per R-DC-06.
"""

import asyncio
import hashlib
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.config import settings
from src.models.enums import Platform
from src.models.scrape_models import ProcessedContent, QuarantineError, ScrapeResult
from src.services.scraper.processing import ScrapeProcessor

logger = logging.getLogger(__name__)

# Retry config per R-DC-06: 3 retries with exponential backoff (5s, 15s, 45s)
MAX_RETRIES = 3
RETRY_DELAYS = [5, 15, 45]


class AbstractPlatformScraper(ABC):
    """Base class for all AI platform scrapers."""

    platform: Platform

    def __init__(
        self,
        http_client: httpx.AsyncClient,
        mongo_db: AsyncIOMotorDatabase,
        processor: ScrapeProcessor | None = None,
    ) -> None:
        self._http = http_client
        self._mongo = mongo_db
        self._processor = processor or ScrapeProcessor()
        self._firecrawl_url = settings.firecrawl_url

    @abstractmethod
    def build_search_url(self, query: str) -> str:
        """Build the platform-specific search URL for a query."""
        ...

    async def scrape(self, query: str) -> ProcessedContent:
        """Execute a scrape: Firecrawl → MongoDB snapshot → Processing → return.

        Implements retry logic per R-DC-06: 3x with exponential backoff.
        On all-retries-fail: raises the last exception per R-DC-07.
        """
        url = self.build_search_url(query)
        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                raw = await self._call_firecrawl(url)
                snapshot_id = await self._store_snapshot(raw, query)
                processed = self._processor.process(raw)
                processed.snapshot_id = snapshot_id
                return processed

            except QuarantineError:
                # Don't retry quarantine errors — content is bad, not transient
                raise

            except Exception as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAYS[attempt]
                    logger.warning(
                        "Scrape attempt %d/%d failed for %s on %s: %s. Retrying in %ds.",
                        attempt + 1,
                        MAX_RETRIES,
                        query,
                        self.platform,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "All %d scrape attempts failed for %s on %s: %s",
                        MAX_RETRIES,
                        query,
                        self.platform,
                        e,
                    )

        raise last_error  # type: ignore[misc]

    async def _call_firecrawl(self, url: str) -> ScrapeResult:
        """Call Firecrawl scrape API and return raw result."""
        start = time.monotonic()
        response = await self._http.post(
            f"{self._firecrawl_url}/v1/scrape",
            json={"url": url, "formats": ["markdown"]},
            timeout=30.0,
        )
        duration_ms = int((time.monotonic() - start) * 1000)

        response.raise_for_status()
        data = response.json()

        content = data.get("data", {}).get("markdown", "") or data.get("data", {}).get("content", "")

        return ScrapeResult(
            url=url,
            content=content,
            status_code=data.get("data", {}).get("metadata", {}).get("statusCode", 200),
            content_length=len(content.encode("utf-8")),
            scrape_duration_ms=duration_ms,
            scraped_at=datetime.now(timezone.utc),
        )

    async def _store_snapshot(self, raw: ScrapeResult, query_text: str) -> str:
        """Store immutable raw snapshot in MongoDB per R-DC-03."""
        content_hash = hashlib.sha256(raw.content.encode("utf-8")).hexdigest()
        doc = {
            "query_text": query_text,
            "platform": self.platform.value,
            "raw_content": raw.content,
            "content_hash": content_hash,
            "scraped_at": raw.scraped_at,
            "scrape_duration_ms": raw.scrape_duration_ms,
            "metadata": {
                "url": raw.url,
                "status_code": raw.status_code,
                "content_length": raw.content_length,
            },
        }
        result = await self._mongo["snapshots"].insert_one(doc)
        return str(result.inserted_id)

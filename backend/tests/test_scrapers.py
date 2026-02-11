"""Tests for platform scrapers — ChatGPT, Perplexity, Google AI.

All Firecrawl calls are mocked via httpx transport. MongoDB uses mongomock-motor
pattern (AsyncMock). Tests verify:
  - URL building per platform
  - Firecrawl call → snapshot storage → processing pipeline
  - Retry logic on transient failures
  - QuarantineError propagation (no retry)
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.models.enums import Platform
from src.models.scrape_models import QuarantineError
from src.services.scraper.chatgpt import ChatGPTScraper
from src.services.scraper.google_ai import GoogleAIScraper
from src.services.scraper.perplexity import PerplexityScraper


# ── Firecrawl response fixtures ─────────────────────────────

FIRECRAWL_CHATGPT_RESPONSE = {
    "success": True,
    "data": {
        "markdown": (
            "# Best Air Purifiers 2026\n\n"
            "Here are the top air purifiers recommended by experts:\n\n"
            "1. **Levoit Core 300S** — Best overall value with HEPA filtration "
            "and smart app control. Excellent for rooms up to 1,095 sq ft.\n\n"
            "2. **Dyson Purifier Big Quiet** — Premium option for whole-room "
            "purification with formaldehyde sensing.\n\n"
            "3. **Coway Airmega 400** — Great for large rooms with dual HEPA "
            "filtration and real-time air quality display.\n\n"
            "4. **Honeywell HPA300** — Reliable budget choice covering up to "
            "465 sq ft with true HEPA.\n"
        ),
        "metadata": {"statusCode": 200, "title": "Best Air Purifiers"},
    },
}

FIRECRAWL_PERPLEXITY_RESPONSE = {
    "success": True,
    "data": {
        "markdown": (
            "# Air Purifier Recommendations\n\n"
            "Based on expert reviews and testing data:\n\n"
            "The **Levoit Core 300S** is widely regarded as the best value "
            "air purifier for most people. It offers true HEPA H13 filtration "
            "at a competitive price point.\n\n"
            "For premium needs, the **Dyson Purifier Big Quiet Formaldehyde** "
            "provides superior whole-room coverage.\n\n"
            "The **Coway Airmega 400** excels in large spaces with its dual "
            "filtration system.\n\n"
            "Sources: Wirecutter, Consumer Reports, RTINGS\n"
        ),
        "metadata": {"statusCode": 200},
    },
}

FIRECRAWL_GOOGLE_AI_RESPONSE = {
    "success": True,
    "data": {
        "markdown": (
            "## AI Overview\n\n"
            "According to expert reviews, the best air purifiers include:\n\n"
            "- **Levoit Core 300S**: Best overall for most households\n"
            "- **Coway Airmega 400**: Best for large rooms\n"
            "- **Dyson Purifier Big Quiet**: Best premium option\n"
            "- **Honeywell HPA300**: Best budget pick\n\n"
            "Key factors to consider: room size, CADR rating, noise level.\n"
        ),
        "metadata": {"statusCode": 200},
    },
}


# ── Mock helpers ─────────────────────────────────────────────


def _mock_mongo_db():
    """Create a mock MongoDB database with insert_one returning a fake ObjectId."""
    db = MagicMock()
    collection = AsyncMock()
    insert_result = MagicMock()
    insert_result.inserted_id = "507f1f77bcf86cd799439011"
    collection.insert_one.return_value = insert_result
    db.__getitem__ = MagicMock(return_value=collection)
    return db, collection


def _mock_http_client(response_json: dict, status_code: int = 200):
    """Create a mock httpx.AsyncClient that returns fixed responses."""
    client = AsyncMock(spec=httpx.AsyncClient)
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.json.return_value = response_json
    response.raise_for_status = MagicMock()
    if status_code >= 400:
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=response
        )
    client.post.return_value = response
    return client


# ── Test: URL building ───────────────────────────────────────


class TestUrlBuilding:
    def test_chatgpt_url(self) -> None:
        scraper = ChatGPTScraper.__new__(ChatGPTScraper)
        url = scraper.build_search_url("best air purifier 2026")
        assert url == "https://chatgpt.com/search?q=best+air+purifier+2026"

    def test_chatgpt_url_special_chars(self) -> None:
        scraper = ChatGPTScraper.__new__(ChatGPTScraper)
        url = scraper.build_search_url("Levoit vs Dyson: which is better?")
        assert "Levoit+vs+Dyson" in url
        assert "which+is+better" in url

    def test_perplexity_url(self) -> None:
        scraper = PerplexityScraper.__new__(PerplexityScraper)
        url = scraper.build_search_url("best air purifier 2026")
        assert url == "https://www.perplexity.ai/search?q=best+air+purifier+2026"

    def test_google_ai_url(self) -> None:
        scraper = GoogleAIScraper.__new__(GoogleAIScraper)
        url = scraper.build_search_url("best air purifier 2026")
        assert url == "https://www.google.com/search?q=best+air+purifier+2026"


# ── Test: platform identity ──────────────────────────────────


class TestPlatformIdentity:
    def test_chatgpt_platform(self) -> None:
        assert ChatGPTScraper.platform == Platform.chatgpt

    def test_perplexity_platform(self) -> None:
        assert PerplexityScraper.platform == Platform.perplexity

    def test_google_ai_platform(self) -> None:
        assert GoogleAIScraper.platform == Platform.google_ai


# ── Test: full scrape pipeline ───────────────────────────────


class TestScrapePipeline:
    @pytest.mark.asyncio
    async def test_chatgpt_scrape_returns_processed_content(self) -> None:
        mongo_db, collection = _mock_mongo_db()
        http_client = _mock_http_client(FIRECRAWL_CHATGPT_RESPONSE)

        scraper = ChatGPTScraper(http_client=http_client, mongo_db=mongo_db)
        result = await scraper.scrape("best air purifier 2026")

        assert "Levoit Core 300S" in result.clean_text
        assert "Dyson" in result.clean_text
        assert result.char_count > 0
        assert len(result.content_hash) == 64

    @pytest.mark.asyncio
    async def test_perplexity_scrape_returns_processed_content(self) -> None:
        mongo_db, collection = _mock_mongo_db()
        http_client = _mock_http_client(FIRECRAWL_PERPLEXITY_RESPONSE)

        scraper = PerplexityScraper(http_client=http_client, mongo_db=mongo_db)
        result = await scraper.scrape("best air purifier 2026")

        assert "Levoit Core 300S" in result.clean_text
        assert result.char_count > 0

    @pytest.mark.asyncio
    async def test_google_ai_scrape_returns_processed_content(self) -> None:
        mongo_db, collection = _mock_mongo_db()
        http_client = _mock_http_client(FIRECRAWL_GOOGLE_AI_RESPONSE)

        scraper = GoogleAIScraper(http_client=http_client, mongo_db=mongo_db)
        result = await scraper.scrape("best air purifier 2026")

        assert "Levoit Core 300S" in result.clean_text
        assert "Coway Airmega 400" in result.clean_text


# ── Test: MongoDB snapshot storage ───────────────────────────


class TestSnapshotStorage:
    @pytest.mark.asyncio
    async def test_snapshot_stored_in_mongodb(self) -> None:
        mongo_db, collection = _mock_mongo_db()
        http_client = _mock_http_client(FIRECRAWL_CHATGPT_RESPONSE)

        scraper = ChatGPTScraper(http_client=http_client, mongo_db=mongo_db)
        await scraper.scrape("best air purifier")

        # Verify insert_one was called
        collection.insert_one.assert_called_once()
        doc = collection.insert_one.call_args[0][0]

        # Verify required fields per plan Section 3.3
        assert doc["query_text"] == "best air purifier"
        assert doc["platform"] == "chatgpt"
        assert "raw_content" in doc
        assert len(doc["content_hash"]) == 64
        assert "scraped_at" in doc
        assert "metadata" in doc
        assert "url" in doc["metadata"]
        assert "status_code" in doc["metadata"]
        assert "content_length" in doc["metadata"]


# ── Test: retry logic ────────────────────────────────────────


class TestRetryLogic:
    @pytest.mark.asyncio
    @patch("src.services.scraper.base.asyncio.sleep", new_callable=AsyncMock)
    async def test_retries_on_transient_error(self, mock_sleep: AsyncMock) -> None:
        mongo_db, _ = _mock_mongo_db()
        http_client = AsyncMock(spec=httpx.AsyncClient)

        # First 2 calls fail, 3rd succeeds
        fail_response = MagicMock(spec=httpx.Response)
        fail_response.raise_for_status.side_effect = httpx.ConnectError("connection refused")

        success_response = MagicMock(spec=httpx.Response)
        success_response.status_code = 200
        success_response.json.return_value = FIRECRAWL_CHATGPT_RESPONSE
        success_response.raise_for_status = MagicMock()

        http_client.post.side_effect = [
            httpx.ConnectError("connection refused"),
            httpx.ConnectError("connection refused"),
            success_response,
        ]

        scraper = ChatGPTScraper(http_client=http_client, mongo_db=mongo_db)
        result = await scraper.scrape("test query")

        assert "Levoit" in result.clean_text
        assert http_client.post.call_count == 3
        # Verify backoff delays: 5s, 15s
        assert mock_sleep.call_count == 2
        mock_sleep.assert_any_call(5)
        mock_sleep.assert_any_call(15)

    @pytest.mark.asyncio
    @patch("src.services.scraper.base.asyncio.sleep", new_callable=AsyncMock)
    async def test_raises_after_all_retries_fail(self, mock_sleep: AsyncMock) -> None:
        mongo_db, _ = _mock_mongo_db()
        http_client = AsyncMock(spec=httpx.AsyncClient)
        http_client.post.side_effect = httpx.ConnectError("connection refused")

        scraper = ChatGPTScraper(http_client=http_client, mongo_db=mongo_db)

        with pytest.raises(httpx.ConnectError):
            await scraper.scrape("test query")

        assert http_client.post.call_count == 3

    @pytest.mark.asyncio
    async def test_quarantine_error_not_retried(self) -> None:
        """QuarantineError should propagate immediately without retrying."""
        mongo_db, _ = _mock_mongo_db()
        # Return empty content which triggers QuarantineError
        empty_response = {
            "success": True,
            "data": {"markdown": "", "metadata": {"statusCode": 200}},
        }
        http_client = _mock_http_client(empty_response)

        scraper = ChatGPTScraper(http_client=http_client, mongo_db=mongo_db)

        with pytest.raises(QuarantineError, match="empty_content"):
            await scraper.scrape("test query")

        # Should only call Firecrawl once (no retries for quarantine)
        http_client.post.assert_called_once()

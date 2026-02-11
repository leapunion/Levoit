"""Tests for Snapshot API endpoint.

Uses running MongoDB instance. Per-test isolation via collection delete.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from src.api.deps import _get_mongo
from src.main import app

MONGO_URL = "mongodb://localhost:27017"
MONGO_DB = "levoit_geo_test"
BASE = "/api/v1/visibility/snapshots"


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Per-test MongoDB client with seeded snapshots."""
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    mongo_db = mongo_client[MONGO_DB]

    # Clean collection
    await mongo_db["snapshots"].delete_many({})

    # Seed two snapshots
    now = datetime.now(timezone.utc)
    await mongo_db["snapshots"].insert_one({
        "_id": ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"),
        "query_text": "best air purifier",
        "platform": "chatgpt",
        "raw_content": "<div>Levoit is the top rated air purifier...</div>",
        "content_hash": "abc123",
        "scraped_at": now,
        "scrape_duration_ms": 1500,
        "metadata": {
            "url": "https://chatgpt.com/search?q=best+air+purifier",
            "status_code": 200,
            "content_length": 5000,
        },
    })
    await mongo_db["snapshots"].insert_one({
        "_id": ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb"),
        "query_text": "levoit vs dyson",
        "platform": "perplexity",
        "raw_content": "# Comparison\nLevoit Core 300 vs Dyson...",
        "content_hash": "def456",
        "scraped_at": now,
        "scrape_duration_ms": 800,
        "metadata": {
            "url": "https://perplexity.ai/search?q=levoit+vs+dyson",
            "status_code": 200,
            "content_length": 3000,
        },
    })

    def _override_get_mongo():
        return mongo_db

    app.dependency_overrides[_get_mongo] = _override_get_mongo
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await mongo_db["snapshots"].delete_many({})
    mongo_client.close()


class TestGetSnapshot:
    @pytest.mark.asyncio
    async def test_get_existing(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/aaaaaaaaaaaaaaaaaaaaaaaa")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "aaaaaaaaaaaaaaaaaaaaaaaa"
        assert data["query_text"] == "best air purifier"
        assert data["platform"] == "chatgpt"
        assert "<div>Levoit" in data["raw_content"]
        assert data["content_hash"] == "abc123"
        assert data["metadata"]["status_code"] == 200

    @pytest.mark.asyncio
    async def test_get_second_snapshot(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/bbbbbbbbbbbbbbbbbbbbbbbb")
        assert resp.status_code == 200
        data = resp.json()
        assert data["platform"] == "perplexity"
        assert data["query_text"] == "levoit vs dyson"

    @pytest.mark.asyncio
    async def test_not_found(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/cccccccccccccccccccccccc")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_object_id(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/not-a-valid-id")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_raw_content_returned_as_is(self, client: AsyncClient) -> None:
        """Content should be returned unprocessed."""
        resp = await client.get(f"{BASE}/aaaaaaaaaaaaaaaaaaaaaaaa")
        data = resp.json()
        # HTML tags preserved (not cleaned)
        assert "<div>" in data["raw_content"]

    @pytest.mark.asyncio
    async def test_metadata_fields_present(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/aaaaaaaaaaaaaaaaaaaaaaaa")
        data = resp.json()
        assert "scrape_duration_ms" in data
        assert data["scrape_duration_ms"] == 1500
        assert "metadata" in data
        assert "url" in data["metadata"]
        assert "content_length" in data["metadata"]

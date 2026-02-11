"""Tests for Query management CRUD API endpoints.

Uses the running PostgreSQL instance (tables from Alembic migrations).
Per-test isolation via DELETE + RESTART IDENTITY.
Engine created per-test to avoid asyncpg event-loop mismatch.
"""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.api.deps import _get_db
from src.main import app

TEST_DB_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo"


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a per-test engine, clean vis_query, and yield an async client."""
    engine = create_async_engine(TEST_DB_URL, pool_size=5, max_overflow=0)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Clean up before test (dependents first due to FK)
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_query"))
        await conn.execute(text("ALTER SEQUENCE vis_query_id_seq RESTART WITH 1"))

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[_get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()


BASE = "/api/v1/visibility/queries"


# ── Create ───────────────────────────────────────────────────


class TestCreateQuery:
    @pytest.mark.asyncio
    async def test_create_query(self, client: AsyncClient) -> None:
        resp = await client.post(BASE, json={
            "query_text": "best air purifier 2026",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["query_text"] == "best air purifier 2026"
        assert data["category"] == "general"
        assert data["priority"] == "medium"
        assert data["is_active"] is True
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_with_all_fields(self, client: AsyncClient) -> None:
        resp = await client.post(BASE, json={
            "query_text": "levoit vs dyson",
            "category": "product_comparison",
            "priority": "high",
            "brands": ["Levoit", "Dyson"],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["category"] == "product_comparison"
        assert data["priority"] == "high"
        assert data["brands"] == ["Levoit", "Dyson"]

    @pytest.mark.asyncio
    async def test_create_missing_query_text(self, client: AsyncClient) -> None:
        resp = await client.post(BASE, json={})
        assert resp.status_code == 422


# ── Get by ID ────────────────────────────────────────────────


class TestGetQuery:
    @pytest.mark.asyncio
    async def test_get_existing(self, client: AsyncClient) -> None:
        create_resp = await client.post(BASE, json={"query_text": "test query"})
        qid = create_resp.json()["id"]

        resp = await client.get(f"{BASE}/{qid}")
        assert resp.status_code == 200
        assert resp.json()["query_text"] == "test query"

    @pytest.mark.asyncio
    async def test_get_not_found(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/9999")
        assert resp.status_code == 404


# ── List ─────────────────────────────────────────────────────


class TestListQueries:
    @pytest.mark.asyncio
    async def test_list_empty(self, client: AsyncClient) -> None:
        resp = await client.get(BASE)
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["meta"]["total"] == 0

    @pytest.mark.asyncio
    async def test_list_returns_created_items(self, client: AsyncClient) -> None:
        await client.post(BASE, json={"query_text": "query 1"})
        await client.post(BASE, json={"query_text": "query 2"})

        resp = await client.get(BASE)
        body = resp.json()
        assert body["meta"]["total"] == 2
        assert len(body["data"]) == 2

    @pytest.mark.asyncio
    async def test_pagination(self, client: AsyncClient) -> None:
        for i in range(5):
            await client.post(BASE, json={"query_text": f"query {i}"})

        resp = await client.get(BASE, params={"page": 1, "page_size": 2})
        body = resp.json()
        assert len(body["data"]) == 2
        assert body["meta"]["total"] == 5
        assert body["meta"]["page"] == 1
        assert body["meta"]["page_size"] == 2

    @pytest.mark.asyncio
    async def test_filter_by_category(self, client: AsyncClient) -> None:
        await client.post(BASE, json={"query_text": "q1", "category": "brand_search"})
        await client.post(BASE, json={"query_text": "q2", "category": "general"})

        resp = await client.get(BASE, params={"category": "brand_search"})
        body = resp.json()
        assert body["meta"]["total"] == 1
        assert body["data"][0]["category"] == "brand_search"

    @pytest.mark.asyncio
    async def test_filter_by_priority(self, client: AsyncClient) -> None:
        await client.post(BASE, json={"query_text": "q1", "priority": "high"})
        await client.post(BASE, json={"query_text": "q2", "priority": "low"})

        resp = await client.get(BASE, params={"priority": "high"})
        body = resp.json()
        assert body["meta"]["total"] == 1

    @pytest.mark.asyncio
    async def test_filter_by_active(self, client: AsyncClient) -> None:
        create_resp = await client.post(BASE, json={"query_text": "active"})
        qid = create_resp.json()["id"]

        await client.post(BASE, json={"query_text": "also active"})
        await client.delete(f"{BASE}/{qid}")  # soft delete

        resp = await client.get(BASE, params={"is_active": "true"})
        body = resp.json()
        assert body["meta"]["total"] == 1
        assert body["data"][0]["query_text"] == "also active"


# ── Update ───────────────────────────────────────────────────


class TestUpdateQuery:
    @pytest.mark.asyncio
    async def test_update_query_text(self, client: AsyncClient) -> None:
        create_resp = await client.post(BASE, json={"query_text": "original"})
        qid = create_resp.json()["id"]

        resp = await client.put(f"{BASE}/{qid}", json={"query_text": "updated"})
        assert resp.status_code == 200
        assert resp.json()["query_text"] == "updated"

    @pytest.mark.asyncio
    async def test_partial_update(self, client: AsyncClient) -> None:
        create_resp = await client.post(BASE, json={
            "query_text": "test", "priority": "low",
        })
        qid = create_resp.json()["id"]

        resp = await client.put(f"{BASE}/{qid}", json={"priority": "high"})
        data = resp.json()
        assert data["priority"] == "high"
        assert data["query_text"] == "test"  # unchanged

    @pytest.mark.asyncio
    async def test_update_not_found(self, client: AsyncClient) -> None:
        resp = await client.put(f"{BASE}/9999", json={"query_text": "nope"})
        assert resp.status_code == 404


# ── Delete (soft) ────────────────────────────────────────────


class TestDeleteQuery:
    @pytest.mark.asyncio
    async def test_soft_delete(self, client: AsyncClient) -> None:
        create_resp = await client.post(BASE, json={"query_text": "to delete"})
        qid = create_resp.json()["id"]

        resp = await client.delete(f"{BASE}/{qid}")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

        # Verify still accessible via GET
        get_resp = await client.get(f"{BASE}/{qid}")
        assert get_resp.status_code == 200
        assert get_resp.json()["is_active"] is False

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client: AsyncClient) -> None:
        resp = await client.delete(f"{BASE}/9999")
        assert resp.status_code == 404

"""Tests for Scores + Comparison API endpoints.

Uses running PostgreSQL (vis_score, vis_query).
Redis caching tested with fakeredis.
"""

from collections.abc import AsyncGenerator

import pytest
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.api.deps import _get_db, _get_redis
from src.main import app

PG_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo"
BASE = "/api/v1/visibility/scores"


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Per-test engine, seeded data, dep overrides."""
    engine = create_async_engine(PG_URL, pool_size=5, max_overflow=0)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    fake_redis = FakeRedis()

    # Clean tables (respect FK order)
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_query"))
        await conn.execute(text("ALTER SEQUENCE vis_query_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE vis_score_id_seq RESTART WITH 1"))

    # Seed vis_query
    async with engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_query (id, query_text, category, priority)
            VALUES
                (1, 'best air purifier', 'general', 'high'),
                (2, 'levoit vs dyson', 'product_comparison', 'medium'),
                (3, 'air purifier for allergies', 'general', 'low')
        """))

    # Seed vis_score — multiple scores per query+brand, different dates
    async with engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_score (query_id, brand, visibility_score, competitive_gap, period, computed_at)
            VALUES
                -- Query 1: Levoit leads
                (1, 'Levoit',    85.0, 25.0, 'raw', '2026-02-10 10:00:00+00'),
                (1, 'Dyson',     60.0, NULL, 'raw', '2026-02-10 10:00:00+00'),
                (1, 'Coway',     45.0, NULL, 'raw', '2026-02-10 10:00:00+00'),
                (1, 'Honeywell', 30.0, NULL, 'raw', '2026-02-10 10:00:00+00'),
                -- Query 1: older scores (should not be used in comparison latest)
                (1, 'Levoit',    70.0, 10.0, 'raw', '2026-02-09 10:00:00+00'),
                (1, 'Dyson',     60.0, NULL, 'raw', '2026-02-09 10:00:00+00'),
                -- Query 2: Dyson leads
                (2, 'Levoit',    40.0, -20.0, 'raw', '2026-02-10 10:00:00+00'),
                (2, 'Dyson',     60.0, NULL,  'raw', '2026-02-10 10:00:00+00'),
                (2, 'Coway',     30.0, NULL,  'raw', '2026-02-10 10:00:00+00'),
                (2, 'Honeywell', 20.0, NULL,  'raw', '2026-02-10 10:00:00+00'),
                -- Query 3: daily aggregate
                (3, 'Levoit',    50.0, 5.0,  'daily', '2026-02-10 02:00:00+00'),
                (3, 'Dyson',     45.0, NULL,  'daily', '2026-02-10 02:00:00+00')
        """))

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    def _override_get_redis():
        return fake_redis

    app.dependency_overrides[_get_db] = _override_get_db
    app.dependency_overrides[_get_redis] = _override_get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await fake_redis.aclose()
    await engine.dispose()


# ── List scores ───────────────────────────────────────────


class TestListScores:
    @pytest.mark.asyncio
    async def test_list_all(self, client: AsyncClient) -> None:
        resp = await client.get(BASE)
        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["total"] == 12

    @pytest.mark.asyncio
    async def test_filter_by_query_id(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"query_id": 1})
        body = resp.json()
        assert body["meta"]["total"] == 6
        assert all(s["query_id"] == 1 for s in body["data"])

    @pytest.mark.asyncio
    async def test_filter_by_brand(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"brand": "Levoit"})
        body = resp.json()
        assert body["meta"]["total"] == 4
        assert all(s["brand"] == "Levoit" for s in body["data"])

    @pytest.mark.asyncio
    async def test_filter_by_period(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"period": "daily"})
        body = resp.json()
        assert body["meta"]["total"] == 2
        assert all(s["period"] == "daily" for s in body["data"])

    @pytest.mark.asyncio
    async def test_pagination(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"page": 1, "page_size": 5})
        body = resp.json()
        assert len(body["data"]) == 5
        assert body["meta"]["total"] == 12
        assert body["meta"]["page_size"] == 5

    @pytest.mark.asyncio
    async def test_ordered_by_computed_at_desc(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"query_id": 1, "brand": "Levoit"})
        body = resp.json()
        dates = [s["computed_at"] for s in body["data"]]
        assert dates == sorted(dates, reverse=True)


# ── Comparison ────────────────────────────────────────────


class TestComparison:
    @pytest.mark.asyncio
    async def test_comparison_returns_all_queries(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/comparison")
        assert resp.status_code == 200
        data = resp.json()
        query_ids = [row["query_id"] for row in data]
        assert 1 in query_ids
        assert 2 in query_ids

    @pytest.mark.asyncio
    async def test_comparison_levoit_leads(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/comparison")
        data = resp.json()
        q1 = next(r for r in data if r["query_id"] == 1)
        assert q1["levoit_score"] == 85.0
        assert q1["dyson_score"] == 60.0
        assert q1["coway_score"] == 45.0
        assert q1["honeywell_score"] == 30.0
        # gap = 85 - 60 = 25
        assert q1["competitive_gap"] == 25.0

    @pytest.mark.asyncio
    async def test_comparison_competitor_leads(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/comparison")
        data = resp.json()
        q2 = next(r for r in data if r["query_id"] == 2)
        assert q2["levoit_score"] == 40.0
        assert q2["dyson_score"] == 60.0
        # gap = 40 - 60 = -20
        assert q2["competitive_gap"] == -20.0

    @pytest.mark.asyncio
    async def test_comparison_uses_latest_scores(self, client: AsyncClient) -> None:
        """Query 1 has older Levoit=70 and newer Levoit=85; should use 85."""
        resp = await client.get(f"{BASE}/comparison")
        data = resp.json()
        q1 = next(r for r in data if r["query_id"] == 1)
        assert q1["levoit_score"] == 85.0  # not 70

    @pytest.mark.asyncio
    async def test_comparison_filter_by_category(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/comparison", params={"category": "product_comparison"})
        data = resp.json()
        assert len(data) == 1
        assert data[0]["query_id"] == 2

    @pytest.mark.asyncio
    async def test_comparison_filter_by_date(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/comparison", params={
            "from": "2026-02-10T00:00:00Z",
            "to": "2026-02-10T23:59:59Z",
        })
        data = resp.json()
        # All 3 queries have scores on Feb 10
        assert len(data) >= 2

    @pytest.mark.asyncio
    async def test_comparison_cached(self, client: AsyncClient) -> None:
        resp1 = await client.get(f"{BASE}/comparison")
        resp2 = await client.get(f"{BASE}/comparison")
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json() == resp2.json()

    @pytest.mark.asyncio
    async def test_comparison_empty(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/comparison", params={
            "category": "nonexistent_category",
        })
        assert resp.status_code == 200
        assert resp.json() == []

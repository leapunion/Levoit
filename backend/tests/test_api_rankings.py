"""Tests for Rankings API endpoints (list, latest, trends).

Uses running PostgreSQL (vis_ranking) and TimescaleDB (ts_search_rank).
Per-test isolation via DELETE. Redis caching tested with fakeredis.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone

import pytest
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.api.deps import _get_db, _get_redis, _get_ts_db
from src.main import app

PG_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo"
TS_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_ts"
BASE = "/api/v1/visibility/rankings"


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Per-test engines, seeded data, and dep overrides."""
    pg_engine = create_async_engine(PG_URL, pool_size=5, max_overflow=0)
    ts_engine = create_async_engine(TS_URL, pool_size=5, max_overflow=0)
    pg_session_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    ts_session_factory = async_sessionmaker(ts_engine, class_=AsyncSession, expire_on_commit=False)
    fake_redis = FakeRedis()

    # Clean tables (dependents first due to FK)
    async with pg_engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_query"))
        await conn.execute(text("ALTER SEQUENCE vis_query_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE vis_ranking_id_seq RESTART WITH 1"))

    async with ts_engine.begin() as conn:
        await conn.execute(text("DELETE FROM ts_search_rank"))

    # Seed vis_query (needed for FK)
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_query (id, query_text, category, priority)
            VALUES (1, 'best air purifier', 'general', 'high'),
                   (2, 'levoit vs dyson', 'product_comparison', 'medium')
        """))

    # Seed vis_ranking
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_ranking (query_id, platform, brand, rank_position, snippet, scraped_at)
            VALUES
                (1, 'chatgpt', 'Levoit', 1, 'Levoit is top rated', '2026-02-10 10:00:00+00'),
                (1, 'chatgpt', 'Dyson', 2, 'Dyson is second', '2026-02-10 10:00:00+00'),
                (1, 'perplexity', 'Levoit', 1, 'Levoit leads', '2026-02-10 10:00:00+00'),
                (1, 'perplexity', 'Dyson', 3, 'Dyson mentioned', '2026-02-10 10:00:00+00'),
                (1, 'chatgpt', 'Levoit', 2, 'Levoit older', '2026-02-09 10:00:00+00'),
                (1, 'chatgpt', 'Dyson', 1, 'Dyson was first', '2026-02-09 10:00:00+00'),
                (2, 'chatgpt', 'Levoit', 1, 'Levoit wins', '2026-02-10 10:00:00+00'),
                (2, 'chatgpt', 'Dyson', 2, 'Dyson close', '2026-02-10 10:00:00+00')
        """))

    # Seed ts_search_rank for trends
    async with ts_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO ts_search_rank (time, query_id, platform, brand, rank_position, visibility_score)
            VALUES
                ('2026-02-08 12:00:00+00', 1, 'chatgpt', 'Levoit', 1, 100),
                ('2026-02-08 12:00:00+00', 1, 'chatgpt', 'Dyson',  3, 50),
                ('2026-02-09 12:00:00+00', 1, 'chatgpt', 'Levoit', 2, 75),
                ('2026-02-09 12:00:00+00', 1, 'chatgpt', 'Dyson',  2, 75),
                ('2026-02-10 12:00:00+00', 1, 'chatgpt', 'Levoit', 1, 100),
                ('2026-02-10 12:00:00+00', 1, 'chatgpt', 'Dyson',  4, 30)
        """))

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with pg_session_factory() as session:
            yield session

    async def _override_get_ts_db() -> AsyncGenerator[AsyncSession, None]:
        async with ts_session_factory() as session:
            yield session

    def _override_get_redis():
        return fake_redis

    app.dependency_overrides[_get_db] = _override_get_db
    app.dependency_overrides[_get_ts_db] = _override_get_ts_db
    app.dependency_overrides[_get_redis] = _override_get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await fake_redis.aclose()
    await pg_engine.dispose()
    await ts_engine.dispose()


# ── List rankings ─────────────────────────────────────────


class TestListRankings:
    @pytest.mark.asyncio
    async def test_list_all(self, client: AsyncClient) -> None:
        resp = await client.get(BASE)
        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["total"] == 8

    @pytest.mark.asyncio
    async def test_filter_by_query_id(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"query_id": 1})
        body = resp.json()
        assert body["meta"]["total"] == 6
        assert all(r["query_id"] == 1 for r in body["data"])

    @pytest.mark.asyncio
    async def test_filter_by_platform(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"platform": "perplexity"})
        body = resp.json()
        assert body["meta"]["total"] == 2
        assert all(r["platform"] == "perplexity" for r in body["data"])

    @pytest.mark.asyncio
    async def test_filter_by_brand(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"brand": "Levoit"})
        body = resp.json()
        assert body["meta"]["total"] == 4
        assert all(r["brand"] == "Levoit" for r in body["data"])

    @pytest.mark.asyncio
    async def test_filter_by_date_range(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={
            "from": "2026-02-10T00:00:00Z",
            "to": "2026-02-10T23:59:59Z",
        })
        body = resp.json()
        # Only rows from 2026-02-10 (6 out of 8)
        assert body["meta"]["total"] == 6

    @pytest.mark.asyncio
    async def test_pagination(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"page": 1, "page_size": 3})
        body = resp.json()
        assert len(body["data"]) == 3
        assert body["meta"]["total"] == 8
        assert body["meta"]["page"] == 1
        assert body["meta"]["page_size"] == 3

    @pytest.mark.asyncio
    async def test_ordered_by_scraped_at_desc(self, client: AsyncClient) -> None:
        resp = await client.get(BASE, params={"query_id": 1, "brand": "Levoit"})
        body = resp.json()
        dates = [r["scraped_at"] for r in body["data"]]
        assert dates == sorted(dates, reverse=True)


# ── Latest rankings ───────────────────────────────────────


class TestLatestRankings:
    @pytest.mark.asyncio
    async def test_latest_returns_most_recent(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/latest", params={"query_id": 1})
        assert resp.status_code == 200
        data = resp.json()
        # 2 platforms × 2 brands = up to 4 distinct combos
        platforms_brands = {(r["platform"], r["brand"]) for r in data}
        assert ("chatgpt", "Levoit") in platforms_brands
        assert ("chatgpt", "Dyson") in platforms_brands
        assert ("perplexity", "Levoit") in platforms_brands

        # chatgpt+Levoit should be the Feb 10 one (rank=1), not Feb 9 (rank=2)
        chatgpt_levoit = [r for r in data if r["platform"] == "chatgpt" and r["brand"] == "Levoit"][0]
        assert chatgpt_levoit["rank_position"] == 1

    @pytest.mark.asyncio
    async def test_latest_cached_on_second_call(self, client: AsyncClient) -> None:
        resp1 = await client.get(f"{BASE}/latest", params={"query_id": 1})
        resp2 = await client.get(f"{BASE}/latest", params={"query_id": 1})
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        # Same data from cache
        assert resp1.json() == resp2.json()

    @pytest.mark.asyncio
    async def test_latest_empty_query(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/latest", params={"query_id": 9999})
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_latest_requires_query_id(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/latest")
        assert resp.status_code == 422


# ── Trends ────────────────────────────────────────────────


class TestTrends:
    @pytest.mark.asyncio
    async def test_daily_trends(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/trends", params={
            "query_id": 1, "granularity": "daily",
        })
        assert resp.status_code == 200
        data = resp.json()
        # 3 days × 2 brands = 6 trend points
        assert len(data) == 6
        assert all("avg_rank" in pt and "avg_score" in pt for pt in data)

    @pytest.mark.asyncio
    async def test_weekly_trends(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/trends", params={
            "query_id": 1, "granularity": "weekly",
        })
        assert resp.status_code == 200
        data = resp.json()
        # Feb 8 (Sun) = week of Feb 2, Feb 9-10 (Mon-Tue) = week of Feb 9
        # 2 weeks × 2 brands = 4 points
        assert len(data) == 4
        # Weekly aggregation produces fewer or equal points than daily
        assert len(data) <= 6  # daily has 6

    @pytest.mark.asyncio
    async def test_trends_filter_by_brand(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/trends", params={
            "query_id": 1, "brands": "Levoit",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert all(pt["brand"] == "Levoit" for pt in data)
        assert len(data) == 3  # 3 days for Levoit

    @pytest.mark.asyncio
    async def test_trends_filter_by_date(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/trends", params={
            "query_id": 1,
            "from": "2026-02-09T00:00:00Z",
            "to": "2026-02-10T23:59:59Z",
        })
        assert resp.status_code == 200
        data = resp.json()
        # 2 days × 2 brands = 4 trend points
        assert len(data) == 4

    @pytest.mark.asyncio
    async def test_trends_empty_query(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/trends", params={"query_id": 9999})
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_trends_requires_query_id(self, client: AsyncClient) -> None:
        resp = await client.get(f"{BASE}/trends")
        assert resp.status_code == 422

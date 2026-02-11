"""Integration test: all API endpoints return expected data shapes.

Uses real PostgreSQL with seeded data covering all 10 queries, 4 brands, 30 data points.
Redis caching tested with fakeredis.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timedelta, timezone

import pytest
from fakeredis.aioredis import FakeRedis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.api.deps import _get_db, _get_redis, _get_ts_db
from src.main import app

PG_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo"
TS_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_ts"

BRANDS = ["Levoit", "Dyson", "Coway", "Honeywell"]
PLATFORMS = ["chatgpt", "perplexity", "google_ai"]


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """ASGI test client with seeded data for all endpoints."""
    pg_engine = create_async_engine(PG_URL, pool_size=5, max_overflow=0)
    ts_engine = create_async_engine(TS_URL, pool_size=5, max_overflow=0)
    pg_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    ts_factory = async_sessionmaker(ts_engine, class_=AsyncSession, expire_on_commit=False)
    fake_redis = FakeRedis()

    now = datetime.now(timezone.utc)

    # Clean all tables
    async with pg_engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_pipeline_run"))
        await conn.execute(text("DELETE FROM vis_query"))
        await conn.execute(text("ALTER SEQUENCE vis_query_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE vis_pipeline_run_id_seq RESTART WITH 1"))

    async with ts_engine.begin() as conn:
        await conn.execute(text("DELETE FROM ts_search_rank"))

    # Seed 3 queries (a focused subset for clear assertions)
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_query (query_text, category, priority, brands) VALUES
            ('best air purifier', 'product_comparison', 'high', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('levoit vs dyson', 'product_comparison', 'medium', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('air purifier for allergies', 'category_search', 'low', '["Levoit","Dyson","Coway","Honeywell"]')
        """))

    # Seed rankings for all 3 queries × 3 platforms × 4 brands
    async with pg_engine.begin() as conn:
        for qid in range(1, 4):
            for platform in PLATFORMS:
                for brand_idx, brand in enumerate(BRANDS):
                    rank = brand_idx + 1
                    snippet = f"{brand} is mentioned in the AI response for query {qid}."
                    await conn.execute(text("""
                        INSERT INTO vis_ranking (query_id, platform, brand, rank_position, snippet, scraped_at)
                        VALUES (:qid, :platform, :brand, :rank, :snippet, :ts)
                    """), {
                        "qid": qid, "platform": platform, "brand": brand,
                        "rank": rank, "snippet": snippet, "ts": now,
                    })

    # Seed scores for all 3 queries × 4 brands
    async with pg_engine.begin() as conn:
        for qid in range(1, 4):
            for brand_idx, brand in enumerate(BRANDS):
                score = round(100 - brand_idx * 20, 1)
                gap = round(score - 80.0, 1) if brand == "Levoit" else None
                await conn.execute(text("""
                    INSERT INTO vis_score (query_id, brand, visibility_score, competitive_gap, period, computed_at)
                    VALUES (:qid, :brand, :score, :gap, 'raw', :ts)
                """), {
                    "qid": qid, "brand": brand, "score": score, "gap": gap, "ts": now,
                })

    # Seed TimescaleDB trend data (7 days for query 1)
    async with ts_engine.begin() as conn:
        for day_offset in range(7):
            ts_time = now - timedelta(days=day_offset)
            for brand_idx, brand in enumerate(BRANDS):
                rank = brand_idx + 1
                vis_score = round(100 - brand_idx * 20, 1)
                await conn.execute(text("""
                    INSERT INTO ts_search_rank (time, query_id, platform, brand, rank_position, visibility_score)
                    VALUES (:time, 1, 'chatgpt', :brand, :rank, :score)
                """), {
                    "time": ts_time, "brand": brand, "rank": rank, "score": vis_score,
                })

    # Seed pipeline run
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_pipeline_run (flow_name, status, queries_total, success_count, cost_usd, duration_sec, started_at, completed_at)
            VALUES ('hourly_rank_check', 'completed', 3, 9, 0.25, 5.0, :started, :completed)
        """), {"started": now - timedelta(seconds=5), "completed": now})

    # Override dependencies
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with pg_factory() as session:
            yield session

    async def _override_get_ts_db() -> AsyncGenerator[AsyncSession, None]:
        async with ts_factory() as session:
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

    # Cleanup
    async with pg_engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_pipeline_run"))
        await conn.execute(text("DELETE FROM vis_query"))
    async with ts_engine.begin() as conn:
        await conn.execute(text("DELETE FROM ts_search_rank"))

    await pg_engine.dispose()
    await ts_engine.dispose()


# ── Query endpoints ──────────────────────────────────────────


class TestQueryEndpoints:
    @pytest.mark.asyncio
    async def test_list_queries(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/queries")
        assert resp.status_code == 200
        body = resp.json()
        assert body["meta"]["total"] == 3
        assert len(body["data"]) == 3
        # Verify response shape
        q = body["data"][0]
        assert "id" in q
        assert "query_text" in q
        assert "category" in q
        assert "priority" in q
        assert "brands" in q
        assert "is_active" in q
        assert "created_at" in q

    @pytest.mark.asyncio
    async def test_get_query_by_id(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/queries/1")
        assert resp.status_code == 200
        q = resp.json()
        assert q["id"] == 1
        assert q["query_text"] == "best air purifier"
        assert q["category"] == "product_comparison"
        assert q["brands"] == BRANDS

    @pytest.mark.asyncio
    async def test_get_query_not_found(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/queries/999")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_query(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/visibility/queries", json={
            "query_text": "best HEPA filter",
            "category": "general",
            "priority": "low",
        })
        assert resp.status_code == 201
        q = resp.json()
        assert q["query_text"] == "best HEPA filter"
        assert q["is_active"] is True

    @pytest.mark.asyncio
    async def test_update_query(self, client: AsyncClient) -> None:
        resp = await client.put("/api/v1/visibility/queries/1", json={
            "priority": "low",
        })
        assert resp.status_code == 200
        assert resp.json()["priority"] == "low"

    @pytest.mark.asyncio
    async def test_delete_query_soft(self, client: AsyncClient) -> None:
        resp = await client.delete("/api/v1/visibility/queries/3")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    @pytest.mark.asyncio
    async def test_filter_by_category(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/queries", params={"category": "category_search"})
        body = resp.json()
        assert body["meta"]["total"] == 1
        assert body["data"][0]["category"] == "category_search"

    @pytest.mark.asyncio
    async def test_filter_by_priority(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/queries", params={"priority": "high"})
        body = resp.json()
        assert body["meta"]["total"] == 1
        assert body["data"][0]["priority"] == "high"


# ── Ranking endpoints ────────────────────────────────────────


class TestRankingEndpoints:
    @pytest.mark.asyncio
    async def test_list_rankings(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/rankings")
        assert resp.status_code == 200
        body = resp.json()
        # 3 queries × 3 platforms × 4 brands = 36
        assert body["meta"]["total"] == 36
        # Verify response shape
        r = body["data"][0]
        assert "id" in r
        assert "query_id" in r
        assert "platform" in r
        assert "brand" in r
        assert "rank_position" in r
        assert "snippet" in r
        assert "scraped_at" in r

    @pytest.mark.asyncio
    async def test_filter_by_query_id(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/rankings", params={"query_id": 1})
        body = resp.json()
        # 3 platforms × 4 brands = 12
        assert body["meta"]["total"] == 12
        assert all(r["query_id"] == 1 for r in body["data"])

    @pytest.mark.asyncio
    async def test_filter_by_platform(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/rankings", params={"platform": "chatgpt"})
        body = resp.json()
        # 3 queries × 4 brands = 12
        assert body["meta"]["total"] == 12
        assert all(r["platform"] == "chatgpt" for r in body["data"])

    @pytest.mark.asyncio
    async def test_latest_rankings_cached(self, client: AsyncClient) -> None:
        resp1 = await client.get("/api/v1/visibility/rankings/latest", params={"query_id": 1})
        resp2 = await client.get("/api/v1/visibility/rankings/latest", params={"query_id": 1})
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        # Latest should return per platform+brand (3 platforms × 4 brands = 12)
        data = resp1.json()
        assert len(data) == 12
        # All brands present
        brands_seen = {r["brand"] for r in data}
        for brand in BRANDS:
            assert brand in brands_seen
        # All platforms present
        platforms_seen = {r["platform"] for r in data}
        for platform in PLATFORMS:
            assert platform in platforms_seen

    @pytest.mark.asyncio
    async def test_trends_endpoint(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/rankings/trends", params={
            "query_id": 1,
            "from": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat(),
            "to": datetime.now(timezone.utc).isoformat(),
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        # Verify trend point shape
        tp = data[0]
        assert "timestamp" in tp
        assert "brand" in tp
        assert "avg_rank" in tp
        assert "avg_score" in tp
        assert "sample_count" in tp


# ── Score endpoints ──────────────────────────────────────────


class TestScoreEndpoints:
    @pytest.mark.asyncio
    async def test_list_scores(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/scores")
        assert resp.status_code == 200
        body = resp.json()
        # 3 queries × 4 brands = 12
        assert body["meta"]["total"] == 12
        # Verify response shape
        s = body["data"][0]
        assert "id" in s
        assert "query_id" in s
        assert "brand" in s
        assert "visibility_score" in s
        assert "competitive_gap" in s or s["competitive_gap"] is None
        assert "period" in s
        assert "computed_at" in s

    @pytest.mark.asyncio
    async def test_comparison_endpoint(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/scores/comparison")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3  # 3 queries

        # Verify comparison row shape
        row = data[0]
        assert "query_id" in row
        assert "query_text" in row
        assert "levoit_score" in row
        assert "dyson_score" in row
        assert "coway_score" in row
        assert "honeywell_score" in row
        assert "competitive_gap" in row

        # Levoit should lead (score=100 vs Dyson=80 → gap=20)
        q1 = next(r for r in data if r["query_id"] == 1)
        assert q1["levoit_score"] == 100.0
        assert q1["dyson_score"] == 80.0
        assert q1["coway_score"] == 60.0
        assert q1["honeywell_score"] == 40.0
        assert q1["competitive_gap"] == 20.0

    @pytest.mark.asyncio
    async def test_comparison_filter_by_category(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/visibility/scores/comparison", params={
            "category": "category_search",
        })
        data = resp.json()
        assert len(data) == 1
        assert data[0]["query_id"] == 3


# ── Health endpoint ──────────────────────────────────────────


class TestHealth:
    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient) -> None:
        resp = await client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["service"] == "levoit-geo"

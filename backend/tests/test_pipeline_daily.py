"""Tests for daily_full_scan Prefect pipeline.

Uses running PostgreSQL and TimescaleDB. Per-test isolation via DELETE.
Redis tested with fakeredis. Scraping mocked via AsyncMock.
"""

from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fakeredis.aioredis import FakeRedis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.models.enums import Platform
from src.models.scrape_models import ProcessedContent
from src.pipelines.daily_full_scan import daily_full_scan_impl
from src.services.scraper.orchestrator import OrchestratorResult, ScrapeFailure

PG_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo"
TS_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_ts"


def _make_processed(text_content: str, snapshot_id: str = "aaaaaaaaaaaaaaaaaaaaaaaa") -> ProcessedContent:
    """Create a ProcessedContent fixture with given text."""
    return ProcessedContent(
        clean_text=text_content,
        content_hash="test_hash",
        char_count=len(text_content),
        url="https://test.example.com",
        status_code=200,
        scraped_at=datetime.now(timezone.utc),
        scrape_duration_ms=1000,
        snapshot_id=snapshot_id,
        is_duplicate=False,
    )


# AI response where Levoit #1, Dyson #2, Coway #3, Honeywell mentioned-only
CHATGPT_RESPONSE = (
    "1. Levoit Core 300 is the best air purifier for most people. "
    "It offers excellent filtration and quiet operation.\n\n"
    "2. Dyson Pure Cool is a premium alternative with smart features.\n\n"
    "3. Coway Airmega handles large rooms well.\n\n"
    "Honeywell is not typically mentioned in top recommendations."
)

PERPLEXITY_RESPONSE = (
    "Based on recent reviews, we recommend Levoit as the top pick "
    "for air purifiers. Dyson is mentioned as an alternative.\n\n"
    "Coway offers good value for larger spaces."
)


@pytest.fixture
async def pipeline_deps() -> AsyncGenerator[tuple[AsyncSession, AsyncSession, FakeRedis], None]:
    """Per-test PG + TS engines, seeded queries, and fakeredis."""
    pg_engine = create_async_engine(PG_URL, pool_size=5, max_overflow=0)
    ts_engine = create_async_engine(TS_URL, pool_size=5, max_overflow=0)
    pg_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    ts_factory = async_sessionmaker(ts_engine, class_=AsyncSession, expire_on_commit=False)
    fake_redis = FakeRedis()

    # Clean tables (dependents first)
    async with pg_engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_pipeline_run"))
        await conn.execute(text("DELETE FROM vis_query"))
        await conn.execute(text("ALTER SEQUENCE vis_query_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE vis_pipeline_run_id_seq RESTART WITH 1"))

    async with ts_engine.begin() as conn:
        await conn.execute(text("DELETE FROM ts_search_rank"))

    # Seed active queries — include all priorities for daily scan
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_query (id, query_text, category, priority, brands, is_active)
            VALUES (1, 'best air purifier', 'general', 'high',
                    '["Levoit","Dyson","Coway","Honeywell"]'::jsonb, TRUE),
                   (2, 'levoit vs dyson', 'product_comparison', 'medium',
                    '["Levoit","Dyson"]'::jsonb, TRUE),
                   (3, 'quiet air purifier for bedroom', 'general', 'low',
                    '["Levoit","Coway"]'::jsonb, TRUE)
        """))

    async with pg_factory() as pg_session, ts_factory() as ts_session:
        yield pg_session, ts_session, fake_redis

    await fake_redis.aclose()

    async with pg_engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_pipeline_run"))
        await conn.execute(text("DELETE FROM vis_query"))
    async with ts_engine.begin() as conn:
        await conn.execute(text("DELETE FROM ts_search_rank"))

    await pg_engine.dispose()
    await ts_engine.dispose()


class TestDailyFullScan:
    @pytest.mark.asyncio
    async def test_full_pipeline_with_daily_aggregation(self, pipeline_deps) -> None:
        """Full daily pipeline produces vis_score records with period='daily'."""
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_RESPONSE, "aaa111")),
                (1, Platform.perplexity, _make_processed(PERPLEXITY_RESPONSE, "bbb222")),
            ],
            failures=[],
            skipped_dedup=0,
            skipped_rate_limit=0,
        )

        result = await daily_full_scan_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "completed"
        assert result["success_count"] == 2
        assert result["failure_count"] == 0
        assert "daily_scores_count" in result
        assert result["daily_scores_count"] > 0

        # Pipeline run record uses daily flow name
        run = await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"),
            {"id": result["run_id"]},
        )
        run_row = run.mappings().one()
        assert run_row["status"] == "completed"
        assert run_row["flow_name"] == "daily_full_scan"

        # vis_score records with period='raw' (from compute_scores step)
        raw_scores = await pg.execute(
            text("SELECT * FROM vis_score WHERE period = 'raw'"),
        )
        assert len(raw_scores.mappings().all()) > 0

        # vis_score records with period='daily' (from daily aggregation step)
        daily_scores = await pg.execute(
            text("SELECT * FROM vis_score WHERE period = 'daily'"),
        )
        daily_rows = daily_scores.mappings().all()
        assert len(daily_rows) > 0

        # Daily scores should have competitive gap for Levoit
        levoit_daily = [r for r in daily_rows if r["brand"] == "Levoit"]
        assert len(levoit_daily) > 0
        assert levoit_daily[0]["competitive_gap"] is not None

    @pytest.mark.asyncio
    async def test_processes_all_priorities(self, pipeline_deps) -> None:
        """Daily scan includes low-priority queries (unlike hourly)."""
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_RESPONSE)),
            ],
            failures=[],
            skipped_dedup=0,
            skipped_rate_limit=0,
        )

        result = await daily_full_scan_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "completed"

        # Orchestrator should have received all 3 queries (high, medium, low)
        call_args = mock_orch.run.call_args[0][0]
        assert len(call_args) == 3

        # Pipeline run should record all 3 queries
        run = await pg.execute(
            text("SELECT queries_total FROM vis_pipeline_run WHERE id = :id"),
            {"id": result["run_id"]},
        )
        assert run.mappings().one()["queries_total"] == 3

    @pytest.mark.asyncio
    async def test_budget_exceeded_halts(self, pipeline_deps) -> None:
        """Daily pipeline halts when daily budget is exceeded."""
        pg, ts, redis = pipeline_deps

        today_key = "cost:daily:" + datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await redis.set(today_key, "100.0")

        mock_orch = AsyncMock()
        result = await daily_full_scan_impl(
            db=pg, ts_db=ts, redis=redis,
            orchestrator=mock_orch, daily_budget_usd=10.0,
        )

        assert result["status"] == "cost_halted"
        mock_orch.run.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_active_queries_skips(self, pipeline_deps) -> None:
        """Daily pipeline skips when no active queries exist."""
        pg, ts, redis = pipeline_deps

        await pg.execute(text("UPDATE vis_query SET is_active = FALSE"))
        await pg.commit()

        mock_orch = AsyncMock()
        result = await daily_full_scan_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "skipped"
        mock_orch.run.assert_not_called()

    @pytest.mark.asyncio
    async def test_orchestrator_exception_marks_failed(self, pipeline_deps) -> None:
        """Daily pipeline run marked as 'failed' when orchestrator raises."""
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.side_effect = RuntimeError("Connection refused")

        result = await daily_full_scan_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "failed"
        assert "Connection refused" in result["error"]

        run = await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"),
            {"id": result["run_id"]},
        )
        row = run.mappings().one()
        assert row["status"] == "failed"
        assert "Connection refused" in row["error_detail"]

    @pytest.mark.asyncio
    async def test_daily_aggregated_scores_correct(self, pipeline_deps) -> None:
        """Daily aggregated scores average visibility from ts_search_rank.

        ChatGPT-only: Levoit rank 1 -> 0.40 * 100 = 40.0,
                      Dyson rank 2 -> 0.40 * 75 = 30.0.
        Daily scores should match raw scores when only one scrape exists.
        """
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_RESPONSE)),
            ],
        )

        result = await daily_full_scan_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )
        assert result["status"] == "completed"

        # Daily scores should match raw scores (single data point → avg = same)
        daily_scores = await pg.execute(
            text("SELECT brand, visibility_score FROM vis_score "
                 "WHERE query_id = 1 AND period = 'daily' ORDER BY brand"),
        )
        daily_map = {r["brand"]: float(r["visibility_score"]) for r in daily_scores.mappings().all()}

        raw_scores = await pg.execute(
            text("SELECT brand, visibility_score FROM vis_score "
                 "WHERE query_id = 1 AND period = 'raw' ORDER BY brand"),
        )
        raw_map = {r["brand"]: float(r["visibility_score"]) for r in raw_scores.mappings().all()}

        # With a single scrape, daily avg should equal raw scores
        for brand in raw_map:
            assert daily_map[brand] == raw_map[brand], (
                f"{brand}: daily={daily_map.get(brand)} != raw={raw_map[brand]}"
            )


class TestSchedules:
    def test_schedule_constants_importable(self) -> None:
        """Schedule constants are importable and have expected cron patterns."""
        from src.pipelines.schedules import DAILY_CRON, HOURLY_CRON

        assert HOURLY_CRON == "0 */6 * * *"
        assert DAILY_CRON == "0 2 * * *"

    def test_serve_all_importable(self) -> None:
        """serve_all function is importable."""
        from src.pipelines.schedules import serve_all

        assert callable(serve_all)

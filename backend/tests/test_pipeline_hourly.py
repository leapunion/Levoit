"""Tests for hourly_rank_check Prefect pipeline.

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
from src.pipelines.hourly_rank_check import hourly_rank_check_impl
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

# Response where Levoit is recommended first
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

    # Seed active queries
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_query (id, query_text, category, priority, brands, is_active)
            VALUES (1, 'best air purifier', 'general', 'high',
                    '["Levoit","Dyson","Coway","Honeywell"]'::jsonb, TRUE),
                   (2, 'levoit vs dyson', 'product_comparison', 'medium',
                    '["Levoit","Dyson"]'::jsonb, TRUE)
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


class TestHourlyRankCheck:
    @pytest.mark.asyncio
    async def test_full_pipeline_success(self, pipeline_deps) -> None:
        """Full pipeline with mock orchestrator returning successes."""
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

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "completed"
        assert result["success_count"] == 2
        assert result["failure_count"] == 0

        # Orchestrator called once with both queries
        mock_orch.run.assert_called_once()

        # Pipeline run record
        run = await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"),
            {"id": result["run_id"]},
        )
        run_row = run.mappings().one()
        assert run_row["status"] == "completed"
        assert run_row["queries_total"] == 2
        assert run_row["success_count"] == 2
        assert run_row["completed_at"] is not None

        # vis_ranking records
        rankings = await pg.execute(
            text("SELECT * FROM vis_ranking WHERE pipeline_run_id = :run"),
            {"run": result["run_id"]},
        )
        ranking_rows = rankings.mappings().all()
        assert len(ranking_rows) > 0
        brands_ranked = {r["brand"] for r in ranking_rows}
        assert "Levoit" in brands_ranked
        assert "Dyson" in brands_ranked

        # ts_search_rank records
        ts_rows = await ts.execute(text("SELECT * FROM ts_search_rank WHERE query_id = 1"))
        assert len(ts_rows.mappings().all()) > 0

        # vis_score records with competitive gap
        scores = await pg.execute(text("SELECT * FROM vis_score WHERE query_id = 1"))
        score_rows = scores.mappings().all()
        assert len(score_rows) > 0
        levoit_scores = [s for s in score_rows if s["brand"] == "Levoit"]
        assert len(levoit_scores) > 0
        assert levoit_scores[0]["competitive_gap"] is not None

    @pytest.mark.asyncio
    async def test_budget_exceeded_halts(self, pipeline_deps) -> None:
        """Pipeline halts when daily budget is exceeded."""
        pg, ts, redis = pipeline_deps

        # Set cost above budget
        today_key = "cost:daily:" + datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await redis.set(today_key, "100.0")

        mock_orch = AsyncMock()
        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis,
            orchestrator=mock_orch, daily_budget_usd=10.0,
        )

        assert result["status"] == "cost_halted"
        mock_orch.run.assert_not_called()

        run = await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"),
            {"id": result["run_id"]},
        )
        assert run.mappings().one()["status"] == "cost_halted"

    @pytest.mark.asyncio
    async def test_no_active_queries_skips(self, pipeline_deps) -> None:
        """Pipeline skips when no active queries exist."""
        pg, ts, redis = pipeline_deps

        await pg.execute(text("UPDATE vis_query SET is_active = FALSE"))
        await pg.commit()

        mock_orch = AsyncMock()
        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "skipped"
        mock_orch.run.assert_not_called()

    @pytest.mark.asyncio
    async def test_records_failures(self, pipeline_deps) -> None:
        """Pipeline records failure count from orchestrator."""
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_RESPONSE)),
            ],
            failures=[
                ScrapeFailure(
                    query_id=1, query_text="best air purifier",
                    platform=Platform.perplexity,
                    error_type="TimeoutError", error_detail="Connection timed out",
                ),
            ],
            skipped_dedup=0,
            skipped_rate_limit=0,
        )

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "completed"
        assert result["success_count"] == 1
        assert result["failure_count"] == 1

        run = await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"),
            {"id": result["run_id"]},
        )
        row = run.mappings().one()
        assert row["success_count"] == 1
        assert row["failure_count"] == 1

    @pytest.mark.asyncio
    async def test_orchestrator_exception_marks_failed(self, pipeline_deps) -> None:
        """Pipeline run marked as 'failed' when orchestrator raises."""
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.side_effect = RuntimeError("Connection refused")

        result = await hourly_rank_check_impl(
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
    async def test_visibility_scores_calculated(self, pipeline_deps) -> None:
        """Verify visibility scores match expected formula.

        Chatgpt-only: Levoit rank 1 -> 0.40 * 100 = 40.0,
                      Dyson rank 2 -> 0.40 * 75 = 30.0.
        """
        pg, ts, redis = pipeline_deps

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_RESPONSE)),
            ],
        )

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )
        assert result["status"] == "completed"

        scores = await pg.execute(
            text("SELECT brand, visibility_score, competitive_gap "
                 "FROM vis_score WHERE query_id = 1 ORDER BY brand"),
        )
        score_map = {r["brand"]: r for r in scores.mappings().all()}

        # Levoit: chatgpt rank 1 -> weight 0.40 * position_score 100 = 40.0
        assert score_map["Levoit"]["visibility_score"] == 40.0
        # Dyson: chatgpt rank 2 -> weight 0.40 * position_score 75 = 30.0
        assert score_map["Dyson"]["visibility_score"] == 30.0
        # Coway: chatgpt rank 3 -> weight 0.40 * position_score 50 = 20.0
        assert score_map["Coway"]["visibility_score"] == 20.0
        # Honeywell: chatgpt rank 5 -> weight 0.40 * position_score 15 = 6.0
        assert score_map["Honeywell"]["visibility_score"] == 6.0

        # Competitive gap: 40.0 - max(30.0, 20.0, 6.0) = 10.0
        assert score_map["Levoit"]["competitive_gap"] == 10.0
        # Non-Levoit brands have no competitive_gap
        assert score_map["Dyson"]["competitive_gap"] is None

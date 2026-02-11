"""Integration test: end-to-end pipeline with mocked scraping.

Verifies the full data flow: queries → scrape → rankings → scores → pipeline_run.
Uses real PostgreSQL + TimescaleDB, fakeredis, mocked ScrapeOrchestrator.
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
from src.pipelines.tasks import compute_daily_aggregated_scores_impl
from src.services.scraper.orchestrator import OrchestratorResult

PG_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo"
TS_URL = "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_ts"

BRANDS = ["Levoit", "Dyson", "Coway", "Honeywell"]


def _make_processed(text_content: str, snapshot_id: str = "aaaaaaaaaaaaaaaaaaaaaaaa") -> ProcessedContent:
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


# Realistic AI platform responses featuring all 4 brands at different ranks
CHATGPT_TEXT = (
    "1. Levoit Core 300S is the best air purifier for most people. "
    "Excellent HEPA filtration and quiet operation at only 24dB.\n\n"
    "2. Dyson Pure Cool TP07 is a premium alternative with bladeless design.\n\n"
    "3. Coway Airmega AP-1512HH offers great value for medium rooms.\n\n"
    "4. Honeywell HPA300 handles large rooms up to 465 sq. ft.\n\n"
    "5. Blueair Blue Pure 211+ is energy efficient for open spaces."
)

PERPLEXITY_TEXT = (
    "Based on expert reviews, the top air purifiers are:\n\n"
    "1. Dyson Purifier Cool Formaldehyde TP09 — best premium option.\n\n"
    "2. Levoit Core 600S — best for large rooms with VortexAir Technology.\n\n"
    "3. Coway Airmega 400 — excellent for open-concept spaces.\n\n"
    "4. Honeywell InSight HPA5300 — trusted reliability.\n\n"
    "Sources: Wirecutter, CNET, Consumer Reports"
)

GOOGLE_AI_TEXT = (
    "AI Overview: Best Air Purifiers\n\n"
    "• Coway Airmega AP-1512HH Mighty — best value under $200.\n\n"
    "• Levoit Core 300S — popular budget choice with True HEPA.\n\n"
    "• Dyson Purifier Big Quiet — premium option for large rooms.\n\n"
    "• Honeywell HPA200 — mid-range with True HEPA filtration.\n\n"
    "Sources: Consumer Reports, Wirecutter"
)


@pytest.fixture
async def integration_deps() -> AsyncGenerator[tuple[AsyncSession, AsyncSession, FakeRedis], None]:
    """Per-test PG + TS engines with 10 seeded queries and fakeredis."""
    pg_engine = create_async_engine(PG_URL, pool_size=5, max_overflow=0)
    ts_engine = create_async_engine(TS_URL, pool_size=5, max_overflow=0)
    pg_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    ts_factory = async_sessionmaker(ts_engine, class_=AsyncSession, expire_on_commit=False)
    fake_redis = FakeRedis()

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

    # Seed 10 queries matching seed.py
    async with pg_engine.begin() as conn:
        await conn.execute(text("""
            INSERT INTO vis_query (query_text, category, priority, brands) VALUES
            ('best air purifier 2025', 'product_comparison', 'high', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('levoit vs dyson air purifier', 'product_comparison', 'high', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('top rated HEPA air purifiers', 'product_comparison', 'medium', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('is levoit a good brand', 'brand_search', 'high', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('levoit core 300s review', 'brand_search', 'medium', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('air purifier for allergies', 'category_search', 'medium', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('air purifier for pet owners', 'category_search', 'low', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('small room air purifier', 'category_search', 'low', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('do air purifiers really work', 'general', 'low', '["Levoit","Dyson","Coway","Honeywell"]'),
            ('how to choose an air purifier', 'general', 'low', '["Levoit","Dyson","Coway","Honeywell"]')
        """))

    async with pg_factory() as pg_session, ts_factory() as ts_session:
        yield pg_session, ts_session, fake_redis

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


class TestFullPipeline:
    """End-to-end pipeline integration tests."""

    @pytest.mark.asyncio
    async def test_e2e_pipeline_flow(self, integration_deps) -> None:
        """Full pipeline: 10 queries, 3 platforms, all brands ranked.

        Verifies the complete data flow through all pipeline stages:
        1. Queries fetched from DB
        2. Rankings extracted and stored in vis_ranking + ts_search_rank
        3. Scores computed and stored in vis_score
        4. Pipeline run finalized with correct counts
        """
        pg, ts, redis = integration_deps

        # Build mock orchestrator result for all 10 queries across 3 platforms
        successes = []
        for qid in range(1, 11):
            successes.append((qid, Platform.chatgpt, _make_processed(CHATGPT_TEXT, f"chat_{qid:03d}")))
            successes.append((qid, Platform.perplexity, _make_processed(PERPLEXITY_TEXT, f"perp_{qid:03d}")))
            successes.append((qid, Platform.google_ai, _make_processed(GOOGLE_AI_TEXT, f"goog_{qid:03d}")))

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=successes,
            failures=[],
            skipped_dedup=0,
            skipped_rate_limit=0,
        )

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        # Pipeline completed successfully
        assert result["status"] == "completed"
        assert result["success_count"] == 30  # 10 queries × 3 platforms
        assert result["failure_count"] == 0

        # Pipeline run record is correct
        run_row = (await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"), {"id": result["run_id"]},
        )).mappings().one()
        assert run_row["status"] == "completed"
        assert run_row["queries_total"] == 10
        assert run_row["success_count"] == 30
        assert run_row["failure_count"] == 0
        assert run_row["completed_at"] is not None
        assert run_row["duration_sec"] is not None
        assert run_row["duration_sec"] >= 0

        # Rankings stored for all queries
        ranking_count = (await pg.execute(
            text("SELECT COUNT(*) FROM vis_ranking WHERE pipeline_run_id = :run"),
            {"run": result["run_id"]},
        )).scalar()
        assert ranking_count > 0

        # All brands should appear in rankings
        brand_result = await pg.execute(
            text("SELECT DISTINCT brand FROM vis_ranking WHERE pipeline_run_id = :run"),
            {"run": result["run_id"]},
        )
        ranked_brands = {r[0] for r in brand_result}
        for brand in BRANDS:
            assert brand in ranked_brands

        # TimescaleDB records created
        ts_count = (await ts.execute(text("SELECT COUNT(*) FROM ts_search_rank"))).scalar()
        assert ts_count > 0

        # Visibility scores computed for all 10 queries
        score_count = (await pg.execute(
            text("SELECT COUNT(DISTINCT query_id) FROM vis_score WHERE period = 'raw'")
        )).scalar()
        assert score_count == 10

        # Levoit competitive gaps set
        levoit_gaps = (await pg.execute(text(
            "SELECT query_id, competitive_gap FROM vis_score "
            "WHERE brand = 'Levoit' AND period = 'raw' ORDER BY query_id"
        ))).mappings().all()
        assert len(levoit_gaps) == 10
        for gap_row in levoit_gaps:
            assert gap_row["competitive_gap"] is not None

    @pytest.mark.asyncio
    async def test_e2e_then_daily_aggregation(self, integration_deps) -> None:
        """Run hourly pipeline, then daily aggregation, verify daily scores."""
        pg, ts, redis = integration_deps

        # Run hourly pipeline for query 1 only (3 platforms)
        successes = [
            (1, Platform.chatgpt, _make_processed(CHATGPT_TEXT, "chat_001")),
            (1, Platform.perplexity, _make_processed(PERPLEXITY_TEXT, "perp_001")),
            (1, Platform.google_ai, _make_processed(GOOGLE_AI_TEXT, "goog_001")),
        ]

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(successes=successes)

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )
        assert result["status"] == "completed"

        # Verify ts_search_rank has data
        ts_count = (await ts.execute(text("SELECT COUNT(*) FROM ts_search_rank WHERE query_id = 1"))).scalar()
        assert ts_count > 0

        # Run daily aggregation
        daily_count = await compute_daily_aggregated_scores_impl(pg, ts)
        assert daily_count > 0

        # Verify daily scores exist
        daily_scores = (await pg.execute(
            text("SELECT * FROM vis_score WHERE query_id = 1 AND period = 'daily'")
        )).mappings().all()
        assert len(daily_scores) > 0

        # Levoit should have a daily competitive gap
        levoit_daily = [s for s in daily_scores if s["brand"] == "Levoit"]
        assert len(levoit_daily) == 1
        assert levoit_daily[0]["competitive_gap"] is not None

    @pytest.mark.asyncio
    async def test_e2e_partial_failures(self, integration_deps) -> None:
        """Pipeline handles mixed successes and failures gracefully."""
        pg, ts, redis = integration_deps

        from src.services.scraper.orchestrator import ScrapeFailure

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_TEXT)),
                (2, Platform.chatgpt, _make_processed(CHATGPT_TEXT)),
            ],
            failures=[
                ScrapeFailure(
                    query_id=1, query_text="best air purifier 2025",
                    platform=Platform.perplexity,
                    error_type="TimeoutError", error_detail="Connection timed out",
                ),
                ScrapeFailure(
                    query_id=3, query_text="top rated HEPA air purifiers",
                    platform=Platform.google_ai,
                    error_type="HTTPError", error_detail="503 Service Unavailable",
                ),
            ],
            skipped_dedup=1,
            skipped_rate_limit=0,
        )

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        assert result["status"] == "completed"
        assert result["success_count"] == 2
        assert result["failure_count"] == 2

        # Pipeline run records failures correctly
        run_row = (await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"), {"id": result["run_id"]},
        )).mappings().one()
        assert run_row["success_count"] == 2
        assert run_row["failure_count"] == 2
        assert run_row["status"] == "completed"

        # Rankings still exist for the successful scrapes
        ranking_count = (await pg.execute(
            text("SELECT COUNT(*) FROM vis_ranking WHERE pipeline_run_id = :run"),
            {"run": result["run_id"]},
        )).scalar()
        assert ranking_count > 0

    @pytest.mark.asyncio
    async def test_e2e_data_quality_pipeline_run_metrics(self, integration_deps) -> None:
        """Verify pipeline run captures data quality metrics: counts, cost, duration."""
        pg, ts, redis = integration_deps

        # Set a cost value in redis
        today_key = "cost:daily:" + datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await redis.set(today_key, "0.50")

        mock_orch = AsyncMock()
        mock_orch.run.return_value = OrchestratorResult(
            successes=[
                (1, Platform.chatgpt, _make_processed(CHATGPT_TEXT)),
            ],
        )

        result = await hourly_rank_check_impl(
            db=pg, ts_db=ts, redis=redis, orchestrator=mock_orch,
        )

        run_row = (await pg.execute(
            text("SELECT * FROM vis_pipeline_run WHERE id = :id"), {"id": result["run_id"]},
        )).mappings().one()

        # Verify all metrics present
        assert run_row["flow_name"] == "hourly_rank_check"
        assert run_row["queries_total"] == 10
        assert run_row["cost_usd"] == 0.50
        assert run_row["duration_sec"] >= 0
        assert run_row["error_detail"] is None

"""Prefect flow: hourly_rank_check — scrape AI platforms, extract rankings, compute scores.

Pipeline steps:
  1. Fetch active queries from vis_query
  2. Check daily cost budget (halt if exceeded)
  3. Create vis_pipeline_run record
  4. Scrape all via ScrapeOrchestrator
  5. Extract rankings → store in vis_ranking + ts_search_rank
  6. Compute visibility scores → store in vis_score
  7. Finalize pipeline run (status, counts, duration)
"""

import logging

from prefect import flow
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.analyzer import CostTracker
from src.services.scraper.orchestrator import OrchestratorResult, ScrapeOrchestrator

from src.pipelines.tasks import (
    check_daily_budget_impl,
    compute_scores_impl,
    create_pipeline_run_impl,
    extract_and_store_rankings_impl,
    fetch_active_queries_impl,
    finalize_pipeline_run_impl,
)

logger = logging.getLogger(__name__)

FLOW_NAME = "hourly_rank_check"


async def hourly_rank_check_impl(
    *,
    db: AsyncSession,
    ts_db: AsyncSession,
    redis: Redis,
    orchestrator: ScrapeOrchestrator,
    daily_budget_usd: float = 10.0,
) -> dict:
    """Core pipeline logic (no Prefect dependency).

    Args:
        db: PostgreSQL session (vis_query, vis_ranking, vis_score, vis_pipeline_run).
        ts_db: TimescaleDB session (ts_search_rank).
        redis: Redis client (cost tracking).
        orchestrator: Configured ScrapeOrchestrator.
        daily_budget_usd: Daily cost budget in USD.

    Returns:
        Summary dict with run_id, status, success_count, failure_count.
    """
    # 1. Fetch active queries
    queries = await fetch_active_queries_impl(db)
    if not queries:
        logger.info("No active queries — skipping run")
        return {"status": "skipped", "reason": "no_active_queries"}

    # 2. Check daily budget
    cost_tracker = CostTracker(redis, daily_budget_usd)
    budget_exceeded = await check_daily_budget_impl(cost_tracker)

    if budget_exceeded:
        run_id = await create_pipeline_run_impl(db, FLOW_NAME, len(queries))
        cost = await cost_tracker.get_today()
        await finalize_pipeline_run_impl(db, run_id, "cost_halted", 0, 0, cost)
        logger.warning("Daily budget exceeded ($%.2f) — halting", cost)
        return {"run_id": run_id, "status": "cost_halted"}

    # 3. Create pipeline run
    run_id = await create_pipeline_run_impl(db, FLOW_NAME, len(queries))

    try:
        # 4. Scrape all
        query_dicts = [
            {"id": q["id"], "query_text": q["query_text"], "brands": q.get("brands", [])}
            for q in queries
        ]
        orch_result: OrchestratorResult = await orchestrator.run(query_dicts)

        # 5. Process results — extract rankings and store
        query_brands = {q["id"]: q.get("brands", []) for q in queries}
        for query_id, platform, processed in orch_result.successes:
            brands = query_brands.get(query_id, [])
            await extract_and_store_rankings_impl(
                db, ts_db, query_id, platform, processed, brands, run_id,
            )

        # 6. Compute scores for each query that had successes
        seen_queries = {qid for qid, _, _ in orch_result.successes}
        for query_id in seen_queries:
            brands = query_brands.get(query_id, [])
            await compute_scores_impl(db, query_id, brands, run_id)

        # 7. Finalize
        cost = await cost_tracker.get_today()
        await finalize_pipeline_run_impl(
            db, run_id, "completed",
            orch_result.success_count, orch_result.failure_count, cost,
        )

        return {
            "run_id": run_id,
            "status": "completed",
            "success_count": orch_result.success_count,
            "failure_count": orch_result.failure_count,
        }

    except Exception as e:
        cost = await cost_tracker.get_today()
        await finalize_pipeline_run_impl(
            db, run_id, "failed", 0, 0, cost, error_detail=str(e)[:500],
        )
        logger.exception("Pipeline failed: %s", e)
        return {"run_id": run_id, "status": "failed", "error": str(e)}


# ── Prefect-decorated entry point ─────────────────────────────

@flow(name=FLOW_NAME)
async def hourly_rank_check(
    *,
    db: AsyncSession,
    ts_db: AsyncSession,
    redis: Redis,
    orchestrator: ScrapeOrchestrator,
    daily_budget_usd: float = 10.0,
) -> dict:
    """Prefect flow wrapper for hourly_rank_check."""
    return await hourly_rank_check_impl(
        db=db, ts_db=ts_db, redis=redis,
        orchestrator=orchestrator, daily_budget_usd=daily_budget_usd,
    )

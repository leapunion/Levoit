"""Shared Prefect tasks for visibility monitoring pipelines.

Each task has a plain async implementation (_impl suffix) for testability,
and a Prefect-decorated wrapper for production orchestration.
"""

from datetime import datetime, timedelta, timezone

from prefect import task
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import Platform
from src.models.scrape_models import ProcessedContent
from src.services.analyzer import (
    CostTracker,
    PlatformRanking,
    RankExtractor,
    RankResult,
    calculate_competitive_gap,
    calculate_visibility_score,
)


async def fetch_active_queries_impl(db: AsyncSession) -> list[dict]:
    """Fetch active queries ordered by priority."""
    result = await db.execute(text(
        "SELECT id, query_text, category, priority, brands "
        "FROM vis_query WHERE is_active = TRUE "
        "ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"
    ))
    return [dict(r) for r in result.mappings().all()]


async def check_daily_budget_impl(cost_tracker: CostTracker) -> bool:
    """Return True if daily budget is exceeded."""
    return await cost_tracker.is_budget_exceeded()


async def create_pipeline_run_impl(
    db: AsyncSession, flow_name: str, queries_total: int,
) -> int:
    """Insert a vis_pipeline_run record and return its ID."""
    result = await db.execute(
        text(
            "INSERT INTO vis_pipeline_run (flow_name, status, queries_total, started_at) "
            "VALUES (:flow_name, 'running', :total, :started_at) RETURNING id"
        ),
        {"flow_name": flow_name, "total": queries_total, "started_at": datetime.now(timezone.utc)},
    )
    run_id = result.scalar_one()
    await db.commit()
    return run_id


async def extract_and_store_rankings_impl(
    db: AsyncSession,
    ts_db: AsyncSession,
    query_id: int,
    platform: Platform,
    processed: ProcessedContent,
    brands: list[str],
    pipeline_run_id: int,
) -> list[RankResult]:
    """Extract rankings from scraped text and store in vis_ranking + ts_search_rank."""
    extractor = RankExtractor()
    rank_results = extractor.extract(processed.clean_text, brands)
    now = datetime.now(timezone.utc)

    # Store in vis_ranking (PostgreSQL)
    for rr in rank_results:
        if rr.rank_position == 0:
            continue
        await db.execute(
            text(
                "INSERT INTO vis_ranking "
                "(query_id, platform, brand, rank_position, snippet, snapshot_id, "
                "scraped_at, pipeline_run_id) "
                "VALUES (:qid, :plat, :brand, :rank, :snippet, :snap, :at, :run)"
            ),
            {
                "qid": query_id, "plat": platform.value, "brand": rr.brand,
                "rank": rr.rank_position, "snippet": rr.snippet,
                "snap": processed.snapshot_id, "at": now, "run": pipeline_run_id,
            },
        )
    await db.commit()

    # Store in ts_search_rank (TimescaleDB)
    for rr in rank_results:
        if rr.rank_position == 0:
            continue
        pr = PlatformRanking(platform=platform, rank_position=rr.rank_position)
        vis_score = calculate_visibility_score([pr])
        await ts_db.execute(
            text(
                "INSERT INTO ts_search_rank "
                "(time, query_id, platform, brand, rank_position, visibility_score) "
                "VALUES (:time, :qid, :plat, :brand, :rank, :score)"
            ),
            {
                "time": now, "qid": query_id, "plat": platform.value,
                "brand": rr.brand, "rank": rr.rank_position, "score": vis_score,
            },
        )
    await ts_db.commit()

    return rank_results


async def compute_scores_impl(
    db: AsyncSession,
    query_id: int,
    brands: list[str],
    pipeline_run_id: int,
) -> None:
    """Compute visibility scores for all brands on a query and store vis_score."""
    result = await db.execute(
        text(
            "SELECT DISTINCT ON (platform, brand) platform, brand, rank_position "
            "FROM vis_ranking "
            "WHERE query_id = :qid AND pipeline_run_id = :run "
            "ORDER BY platform, brand, scraped_at DESC"
        ),
        {"qid": query_id, "run": pipeline_run_id},
    )
    rows = result.mappings().all()

    # Group by brand
    brand_rankings: dict[str, list[PlatformRanking]] = {}
    for row in rows:
        brand = row["brand"]
        brand_rankings.setdefault(brand, []).append(
            PlatformRanking(platform=Platform(row["platform"]), rank_position=row["rank_position"])
        )

    # Calculate scores
    brand_scores: dict[str, float] = {}
    for brand in brands:
        rankings = brand_rankings.get(brand, [])
        brand_scores[brand] = calculate_visibility_score(rankings)

    # Competitive gap
    levoit_score = brand_scores.get("Levoit", 0.0)
    competitor_scores = {b: s for b, s in brand_scores.items() if b.lower() != "levoit"}
    gap = calculate_competitive_gap(levoit_score, competitor_scores)

    now = datetime.now(timezone.utc)
    for brand, score in brand_scores.items():
        brand_gap = gap if brand.lower() == "levoit" else None
        await db.execute(
            text(
                "INSERT INTO vis_score "
                "(query_id, brand, visibility_score, competitive_gap, period, computed_at) "
                "VALUES (:qid, :brand, :score, :gap, 'raw', :at)"
            ),
            {"qid": query_id, "brand": brand, "score": score, "gap": brand_gap, "at": now},
        )
    await db.commit()


async def finalize_pipeline_run_impl(
    db: AsyncSession,
    run_id: int,
    status: str,
    success_count: int,
    failure_count: int,
    cost_usd: float,
    error_detail: str | None = None,
) -> None:
    """Update vis_pipeline_run with final status."""
    now = datetime.now(timezone.utc)
    await db.execute(
        text(
            "UPDATE vis_pipeline_run SET "
            "status = :status, success_count = :sc, failure_count = :fc, "
            "cost_usd = :cost, error_detail = :err, completed_at = :at, "
            "duration_sec = EXTRACT(EPOCH FROM (:at - started_at)) "
            "WHERE id = :id"
        ),
        {
            "id": run_id, "status": status, "sc": success_count,
            "fc": failure_count, "cost": cost_usd, "err": error_detail, "at": now,
        },
    )
    await db.commit()


async def compute_daily_aggregated_scores_impl(
    db: AsyncSession,
    ts_db: AsyncSession,
) -> int:
    """Compute daily aggregated visibility scores from today's ts_search_rank data.

    Averages visibility_score per query_id × brand for the current day,
    then stores in vis_score with period='daily'. Returns count of scores written.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)

    result = await ts_db.execute(
        text(
            "SELECT query_id, brand, "
            "AVG(visibility_score) AS avg_score "
            "FROM ts_search_rank "
            "WHERE time >= :start AND time < :end "
            "GROUP BY query_id, brand"
        ),
        {"start": today_start, "end": tomorrow_start},
    )
    rows = result.mappings().all()
    if not rows:
        return 0

    # Group by query_id
    query_scores: dict[int, dict[str, float]] = {}
    for row in rows:
        qid = row["query_id"]
        query_scores.setdefault(qid, {})[row["brand"]] = float(row["avg_score"])

    # Compute competitive gap and store daily scores
    now = datetime.now(timezone.utc)
    count = 0
    for qid, brand_scores in query_scores.items():
        levoit_score = brand_scores.get("Levoit", 0.0)
        competitor_scores = {b: s for b, s in brand_scores.items() if b.lower() != "levoit"}
        gap = calculate_competitive_gap(levoit_score, competitor_scores)

        for brand, score in brand_scores.items():
            brand_gap = gap if brand.lower() == "levoit" else None
            await db.execute(
                text(
                    "INSERT INTO vis_score "
                    "(query_id, brand, visibility_score, competitive_gap, period, computed_at) "
                    "VALUES (:qid, :brand, :score, :gap, 'daily', :at)"
                ),
                {"qid": qid, "brand": brand, "score": round(score, 2), "gap": brand_gap, "at": now},
            )
            count += 1
    await db.commit()
    return count


# ── Prefect-decorated wrappers ───────────────────────────────

fetch_active_queries = task(name="fetch_active_queries")(fetch_active_queries_impl)
check_daily_budget = task(name="check_daily_budget")(check_daily_budget_impl)
create_pipeline_run = task(name="create_pipeline_run")(create_pipeline_run_impl)
extract_and_store_rankings = task(name="extract_and_store_rankings")(extract_and_store_rankings_impl)
compute_scores = task(name="compute_scores")(compute_scores_impl)
finalize_pipeline_run = task(name="finalize_pipeline_run")(finalize_pipeline_run_impl)
compute_daily_aggregated_scores = task(name="compute_daily_aggregated_scores")(
    compute_daily_aggregated_scores_impl
)

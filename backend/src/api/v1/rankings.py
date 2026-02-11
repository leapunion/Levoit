"""Ranking API endpoints — list, latest (cached), and trends."""

from datetime import datetime

from fastapi import APIRouter, Query

from src.api.deps import DbSession, RedisClient, TsDbSession
from src.models.schemas import RankingResponse, TrendPoint
from src.services.ranking_service import RankingService
from src.shared.pagination import PaginatedResponse, paginate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[RankingResponse])
async def list_rankings(
    db: DbSession,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    query_id: int | None = Query(None, description="Filter by query ID"),
    platform: str | None = Query(None, description="Filter by platform"),
    brand: str | None = Query(None, description="Filter by brand"),
    from_date: datetime | None = Query(None, alias="from", description="Start date"),
    to_date: datetime | None = Query(None, alias="to", description="End date"),
):
    """List rankings with pagination and optional filters."""
    svc = RankingService(db)
    items, total = await svc.list_rankings(
        page=page, page_size=page_size,
        query_id=query_id, platform=platform, brand=brand,
        from_date=from_date, to_date=to_date,
    )
    return paginate(
        [RankingResponse.model_validate(r) for r in items],
        total, page, page_size,
    )


@router.get("/latest", response_model=list[RankingResponse])
async def get_latest_rankings(
    db: DbSession,
    redis: RedisClient,
    query_id: int = Query(..., description="Query ID"),
):
    """Get most recent ranking per platform+brand for a query (cached 1h)."""
    svc = RankingService(db, redis=redis)
    return await svc.get_latest(query_id)


@router.get("/trends", response_model=list[TrendPoint])
async def get_ranking_trends(
    db: DbSession,
    ts_db: TsDbSession,
    query_id: int = Query(..., description="Query ID"),
    brands: str | None = Query(None, description="Comma-separated brand names"),
    from_date: datetime | None = Query(None, alias="from", description="Start date"),
    to_date: datetime | None = Query(None, alias="to", description="End date"),
    granularity: str = Query("daily", pattern="^(daily|weekly|monthly)$", description="Time bucket"),
):
    """Get time-series trend data from TimescaleDB."""
    brand_list = [b.strip() for b in brands.split(",")] if brands else None
    svc = RankingService(db, ts_db=ts_db)
    return await svc.get_trends(
        query_id=query_id, brands=brand_list,
        from_date=from_date, to_date=to_date,
        granularity=granularity,
    )

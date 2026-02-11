"""Score and comparison API endpoints."""

from datetime import datetime

from fastapi import APIRouter, Query

from src.api.deps import DbSession, RedisClient
from src.models.schemas import ComparisonRow, ScoreResponse
from src.services.score_service import ScoreService
from src.shared.pagination import PaginatedResponse, paginate

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ScoreResponse])
async def list_scores(
    db: DbSession,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    query_id: int | None = Query(None, description="Filter by query ID"),
    brand: str | None = Query(None, description="Filter by brand"),
    period: str | None = Query(None, description="Filter by period (raw/daily/weekly/monthly)"),
):
    """List visibility scores with pagination and filtering."""
    svc = ScoreService(db)
    items, total = await svc.list_scores(
        page=page, page_size=page_size,
        query_id=query_id, brand=brand, period=period,
    )
    return paginate(
        [ScoreResponse.model_validate(s) for s in items],
        total, page, page_size,
    )


@router.get("/comparison", response_model=list[ComparisonRow])
async def get_comparison(
    db: DbSession,
    redis: RedisClient,
    category: str | None = Query(None, description="Filter by query category"),
    from_date: datetime | None = Query(None, alias="from", description="Start date"),
    to_date: datetime | None = Query(None, alias="to", description="End date"),
):
    """Get competitive comparison: Levoit vs competitors per query (cached 1h)."""
    svc = ScoreService(db, redis=redis)
    return await svc.get_comparison(
        category=category, from_date=from_date, to_date=to_date,
    )

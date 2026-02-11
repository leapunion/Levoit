"""Query management CRUD endpoints per R-QM-01 through R-QM-04."""

from fastapi import APIRouter, HTTPException, Query

from src.api.deps import DbSession
from src.models.enums import QueryCategory, QueryPriority
from src.models.schemas import VisQueryCreate, VisQueryResponse, VisQueryUpdate
from src.services.query_service import QueryService
from src.shared.pagination import PaginatedResponse, paginate

router = APIRouter()


def _to_response(query) -> VisQueryResponse:
    return VisQueryResponse.model_validate(query)


@router.get("", response_model=PaginatedResponse[VisQueryResponse])
async def list_queries(
    db: DbSession,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    category: QueryCategory | None = Query(None, description="Filter by category"),
    priority: QueryPriority | None = Query(None, description="Filter by priority"),
    is_active: bool | None = Query(None, description="Filter by active status"),
):
    """List monitored queries with pagination and filtering."""
    svc = QueryService(db)
    items, total = await svc.list_queries(
        page=page, page_size=page_size,
        category=category, priority=priority, is_active=is_active,
    )
    return paginate([_to_response(q) for q in items], total, page, page_size)


@router.post("", response_model=VisQueryResponse, status_code=201)
async def create_query(
    db: DbSession,
    body: VisQueryCreate,
):
    """Create a new monitored search query."""
    svc = QueryService(db)
    query = await svc.create(body)
    return _to_response(query)


@router.get("/{query_id}", response_model=VisQueryResponse)
async def get_query(
    db: DbSession,
    query_id: int,
):
    """Get a single query by ID."""
    svc = QueryService(db)
    query = await svc.get_by_id(query_id)
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found")
    return _to_response(query)


@router.put("/{query_id}", response_model=VisQueryResponse)
async def update_query(
    db: DbSession,
    query_id: int,
    body: VisQueryUpdate,
):
    """Update an existing query's configuration."""
    svc = QueryService(db)
    query = await svc.update(query_id, body)
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found")
    return _to_response(query)


@router.delete("/{query_id}", response_model=VisQueryResponse)
async def delete_query(
    db: DbSession,
    query_id: int,
):
    """Soft-delete a query (sets is_active=False)."""
    svc = QueryService(db)
    query = await svc.soft_delete(query_id)
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found")
    return _to_response(query)

"""QueryService — CRUD operations for monitored search queries."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import QueryCategory, QueryPriority
from src.models.schemas import VisQueryCreate, VisQueryUpdate
from src.models.visibility import VisQuery


class QueryService:
    """Handles VisQuery CRUD with pagination and filtering."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_queries(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        category: QueryCategory | None = None,
        priority: QueryPriority | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[VisQuery], int]:
        """Return paginated list of queries + total count.

        Returns:
            Tuple of (items, total_count).
        """
        stmt = select(VisQuery)

        if category is not None:
            stmt = stmt.where(VisQuery.category == category)
        if priority is not None:
            stmt = stmt.where(VisQuery.priority == priority)
        if is_active is not None:
            stmt = stmt.where(VisQuery.is_active == is_active)

        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self._db.execute(count_stmt)).scalar_one()

        # Paginate
        stmt = stmt.order_by(VisQuery.id.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self._db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_by_id(self, query_id: int) -> VisQuery | None:
        """Fetch a single query by ID."""
        stmt = select(VisQuery).where(VisQuery.id == query_id)
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: VisQueryCreate) -> VisQuery:
        """Create a new monitored query."""
        query = VisQuery(
            query_text=data.query_text,
            category=data.category,
            priority=data.priority,
            brands=data.brands,
        )
        self._db.add(query)
        await self._db.commit()
        await self._db.refresh(query)
        return query

    async def update(self, query_id: int, data: VisQueryUpdate) -> VisQuery | None:
        """Update an existing query. Returns None if not found."""
        query = await self.get_by_id(query_id)
        if query is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(query, field, value)

        query.updated_at = datetime.now(timezone.utc)
        await self._db.commit()
        await self._db.refresh(query)
        return query

    async def soft_delete(self, query_id: int) -> VisQuery | None:
        """Soft-delete a query by setting is_active=False. Returns None if not found."""
        query = await self.get_by_id(query_id)
        if query is None:
            return None

        query.is_active = False
        query.updated_at = datetime.now(timezone.utc)
        await self._db.commit()
        await self._db.refresh(query)
        return query

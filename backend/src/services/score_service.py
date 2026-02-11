"""ScoreService — list scores and build comparison rows."""

import json
from datetime import datetime

from redis.asyncio import Redis
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.schemas import ComparisonRow, ScoreResponse
from src.models.visibility import VisScore

COMPARISON_CACHE_TTL = 3600  # 1 hour


class ScoreService:
    """Handles score listing and competitive comparison queries."""

    def __init__(self, db: AsyncSession, redis: Redis | None = None) -> None:
        self._db = db
        self._redis = redis

    # ── List scores with filters + pagination ────────────────

    async def list_scores(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        query_id: int | None = None,
        brand: str | None = None,
        period: str | None = None,
    ) -> tuple[list[VisScore], int]:
        """Return paginated scores with optional filters."""
        stmt = select(VisScore)

        if query_id is not None:
            stmt = stmt.where(VisScore.query_id == query_id)
        if brand is not None:
            stmt = stmt.where(VisScore.brand == brand)
        if period is not None:
            stmt = stmt.where(VisScore.period == period)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self._db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(VisScore.computed_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self._db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    # ── Comparison: per-query brand scores + gap ─────────────

    async def get_comparison(
        self,
        *,
        category: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[ComparisonRow]:
        """Return competitive comparison rows, one per query."""
        cache_key = f"scores:comparison:{category}:{from_date}:{to_date}"

        # Try cache
        if self._redis:
            cached = await self._redis.get(cache_key)
            if cached is not None:
                return [ComparisonRow(**item) for item in json.loads(cached)]

        params: dict = {}
        where_clauses = ["vq.is_active = true"]

        if category:
            where_clauses.append("vq.category = :category")
            params["category"] = category
        if from_date:
            where_clauses.append("vs.computed_at >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_clauses.append("vs.computed_at <= :to_date")
            params["to_date"] = to_date

        where_sql = " AND ".join(where_clauses)

        # Conditional aggregation to pivot brand scores into columns.
        # Uses the most recent score per query+brand via DISTINCT ON subquery.
        sql = text(f"""
            WITH latest_scores AS (
                SELECT DISTINCT ON (vs.query_id, vs.brand)
                    vs.query_id, vs.brand, vs.visibility_score, vs.computed_at,
                    vq.query_text, vq.category
                FROM vis_score vs
                JOIN vis_query vq ON vs.query_id = vq.id
                WHERE {where_sql}
                ORDER BY vs.query_id, vs.brand, vs.computed_at DESC
            )
            SELECT
                query_id,
                query_text,
                COALESCE(MAX(CASE WHEN LOWER(brand) = 'levoit' THEN visibility_score END), 0)
                    AS levoit_score,
                COALESCE(MAX(CASE WHEN LOWER(brand) = 'dyson' THEN visibility_score END), 0)
                    AS dyson_score,
                COALESCE(MAX(CASE WHEN LOWER(brand) = 'coway' THEN visibility_score END), 0)
                    AS coway_score,
                COALESCE(MAX(CASE WHEN LOWER(brand) = 'honeywell' THEN visibility_score END), 0)
                    AS honeywell_score
            FROM latest_scores
            GROUP BY query_id, query_text
            ORDER BY query_id
        """)

        result = await self._db.execute(sql, params)
        rows = result.mappings().all()

        def _clamp(v: float) -> float:
            return max(0.0, min(100.0, v))

        items = []
        for row in rows:
            levoit = _clamp(float(row["levoit_score"]))
            dyson = _clamp(float(row["dyson_score"]))
            coway = _clamp(float(row["coway_score"]))
            honeywell = _clamp(float(row["honeywell_score"]))
            competitors = [dyson, coway, honeywell]
            best_competitor = max(competitors) if competitors else 0.0
            gap = round(levoit - best_competitor, 2)

            items.append(ComparisonRow(
                query_id=row["query_id"],
                query_text=row["query_text"],
                levoit_score=levoit,
                dyson_score=dyson,
                coway_score=coway,
                honeywell_score=honeywell,
                competitive_gap=gap,
            ))

        # Cache non-empty results
        if self._redis and items:
            data = [item.model_dump(mode="json") for item in items]
            await self._redis.setex(cache_key, COMPARISON_CACHE_TTL, json.dumps(data))

        return items

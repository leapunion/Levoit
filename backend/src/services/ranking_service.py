"""RankingService — list, latest (cached), and trend queries for rankings."""

import json
from datetime import datetime

from redis.asyncio import Redis
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.schemas import RankingResponse, TrendPoint
from src.models.visibility import VisRanking

LATEST_CACHE_TTL = 3600  # 1 hour


class RankingService:
    """Handles ranking list, latest (Redis-cached), and trend queries."""

    def __init__(
        self,
        db: AsyncSession,
        ts_db: AsyncSession | None = None,
        redis: Redis | None = None,
    ) -> None:
        self._db = db
        self._ts_db = ts_db
        self._redis = redis

    # ── List rankings with filters + pagination ──────────────

    async def list_rankings(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        query_id: int | None = None,
        platform: str | None = None,
        brand: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> tuple[list[VisRanking], int]:
        """Return paginated rankings with optional filters."""
        stmt = select(VisRanking)

        if query_id is not None:
            stmt = stmt.where(VisRanking.query_id == query_id)
        if platform is not None:
            stmt = stmt.where(VisRanking.platform == platform)
        if brand is not None:
            stmt = stmt.where(VisRanking.brand == brand)
        if from_date is not None:
            stmt = stmt.where(VisRanking.scraped_at >= from_date)
        if to_date is not None:
            stmt = stmt.where(VisRanking.scraped_at <= to_date)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self._db.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(VisRanking.scraped_at.desc())
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self._db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    # ── Latest per query (Redis-cached) ──────────────────────

    async def get_latest(self, query_id: int) -> list[RankingResponse]:
        """Return most recent ranking per platform+brand, cached 1h in Redis."""
        cache_key = f"rankings:latest:{query_id}"

        # Try cache
        if self._redis:
            cached = await self._redis.get(cache_key)
            if cached is not None:
                return [RankingResponse(**item) for item in json.loads(cached)]

        # DISTINCT ON: latest row per (platform, brand) for this query
        stmt = text("""
            SELECT DISTINCT ON (platform, brand)
                id, query_id, platform, brand, rank_position,
                snippet, source_urls, snapshot_id, scraped_at, pipeline_run_id
            FROM vis_ranking
            WHERE query_id = :query_id
            ORDER BY platform, brand, scraped_at DESC
        """)
        result = await self._db.execute(stmt, {"query_id": query_id})
        rows = result.mappings().all()

        items = [
            RankingResponse(
                id=row["id"],
                query_id=row["query_id"],
                platform=row["platform"],
                brand=row["brand"],
                rank_position=row["rank_position"],
                snippet=row["snippet"],
                source_urls=row["source_urls"],
                snapshot_id=row["snapshot_id"],
                scraped_at=row["scraped_at"],
                pipeline_run_id=row["pipeline_run_id"],
            )
            for row in rows
        ]

        # Cache non-empty results
        if self._redis and items:
            data = [item.model_dump(mode="json") for item in items]
            await self._redis.setex(cache_key, LATEST_CACHE_TTL, json.dumps(data))

        return items

    # ── Trends from TimescaleDB ──────────────────────────────

    async def get_trends(
        self,
        *,
        query_id: int,
        brands: list[str] | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        granularity: str = "daily",
    ) -> list[TrendPoint]:
        """Return time-bucketed trend data from TimescaleDB."""
        if self._ts_db is None:
            return []

        bucket_map = {"daily": "1 day", "weekly": "1 week", "monthly": "1 month"}
        bucket = bucket_map.get(granularity, "1 day")

        params: dict = {"query_id": query_id}
        where_clauses = ["query_id = :query_id"]

        if brands:
            where_clauses.append("brand = ANY(:brands)")
            params["brands"] = brands
        if from_date:
            where_clauses.append("time >= :from_date")
            params["from_date"] = from_date
        if to_date:
            where_clauses.append("time <= :to_date")
            params["to_date"] = to_date

        where_sql = " AND ".join(where_clauses)

        # bucket comes from controlled dict — safe to interpolate
        sql = text(f"""
            SELECT
                time_bucket('{bucket}', time) AS timestamp,
                brand,
                AVG(rank_position)    AS avg_rank,
                AVG(visibility_score) AS avg_score,
                COUNT(*)              AS sample_count
            FROM ts_search_rank
            WHERE {where_sql}
            GROUP BY timestamp, brand
            ORDER BY timestamp, brand
        """)

        result = await self._ts_db.execute(sql, params)
        rows = result.mappings().all()

        return [
            TrendPoint(
                timestamp=row["timestamp"],
                brand=row["brand"],
                avg_rank=round(float(row["avg_rank"]), 2),
                avg_score=round(float(row["avg_score"]), 2),
                sample_count=int(row["sample_count"]),
            )
            for row in rows
        ]

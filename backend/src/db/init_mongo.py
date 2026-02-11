"""MongoDB collection and index initialization.

Run standalone: uv run python -m src.db.init_mongo
Or called from application startup.
"""

import asyncio

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

from src.config import settings


async def init_mongo_indexes() -> None:
    """Create collections and indexes for snapshots and quarantine."""
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client[settings.mongo_db]

    # ── snapshots collection ───────────────────────────────
    snapshots = db["snapshots"]
    await snapshots.create_indexes([
        IndexModel(
            [("scraped_at", ASCENDING)],
            name="ttl_scraped_at_90d",
            expireAfterSeconds=7_776_000,  # 90 days
        ),
        IndexModel(
            [("query_id", ASCENDING), ("platform", ASCENDING), ("scraped_at", DESCENDING)],
            name="idx_query_platform_time",
        ),
        IndexModel(
            [("content_hash", ASCENDING)],
            name="idx_content_hash",
        ),
    ])

    # ── quarantine collection ──────────────────────────────
    quarantine = db["quarantine"]
    await quarantine.create_indexes([
        IndexModel(
            [("created_at", ASCENDING)],
            name="ttl_created_at_30d",
            expireAfterSeconds=2_592_000,  # 30 days
        ),
        IndexModel(
            [("query_id", ASCENDING), ("platform", ASCENDING)],
            name="idx_quarantine_query_platform",
        ),
    ])

    client.close()
    print("MongoDB indexes created successfully")


if __name__ == "__main__":
    asyncio.run(init_mongo_indexes())

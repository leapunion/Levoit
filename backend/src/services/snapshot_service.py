"""SnapshotService — retrieve raw snapshots from MongoDB."""

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase


class SnapshotService:
    """Handles snapshot retrieval from MongoDB."""

    def __init__(self, mongo: AsyncIOMotorDatabase) -> None:
        self._collection = mongo["snapshots"]

    async def get_by_id(self, snapshot_id: str) -> dict | None:
        """Fetch a snapshot by ObjectId string. Returns None if not found."""
        try:
            oid = ObjectId(snapshot_id)
        except (InvalidId, TypeError):
            return None

        doc = await self._collection.find_one({"_id": oid})
        if doc is None:
            return None

        return {
            "id": str(doc["_id"]),
            "query_text": doc.get("query_text"),
            "platform": doc.get("platform"),
            "raw_content": doc.get("raw_content"),
            "content_hash": doc.get("content_hash"),
            "scraped_at": doc.get("scraped_at"),
            "scrape_duration_ms": doc.get("scrape_duration_ms"),
            "metadata": doc.get("metadata"),
        }

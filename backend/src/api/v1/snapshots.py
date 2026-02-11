"""Snapshot API endpoint — raw content retrieval from MongoDB."""

from fastapi import APIRouter, HTTPException

from src.api.deps import MongoDb
from src.services.snapshot_service import SnapshotService

router = APIRouter()


@router.get("/{snapshot_id}")
async def get_snapshot(
    mongo: MongoDb,
    snapshot_id: str,
):
    """Get a raw snapshot by its MongoDB ObjectId."""
    svc = SnapshotService(mongo)
    doc = await svc.get_by_id(snapshot_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return doc

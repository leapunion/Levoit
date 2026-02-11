"""API v1 router aggregation."""

from fastapi import APIRouter

from src.api.v1.queries import router as queries_router
from src.api.v1.rankings import router as rankings_router
from src.api.v1.scores import router as scores_router
from src.api.v1.snapshots import router as snapshots_router

router = APIRouter()

router.include_router(queries_router, prefix="/visibility/queries", tags=["queries"])
router.include_router(rankings_router, prefix="/visibility/rankings", tags=["rankings"])
router.include_router(scores_router, prefix="/visibility/scores", tags=["scores"])
router.include_router(snapshots_router, prefix="/visibility/snapshots", tags=["snapshots"])

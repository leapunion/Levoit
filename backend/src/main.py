"""Levoit GEO Platform — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db.mongo import close_mongo, connect_mongo, get_mongo_db
from src.db.postgres import engine, ts_engine
from src.db.redis import close_redis, connect_redis, get_redis

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: verify DB connections. Shutdown: close pools."""
    # ── Startup ────────────────────────────────────────────
    logging.basicConfig(level=settings.log_level)

    # PostgreSQL
    from sqlalchemy import text

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("PostgreSQL connected: %s", settings.database_url.split("@")[-1])

    # TimescaleDB
    async with ts_engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("TimescaleDB connected: %s", settings.timescale_url.split("@")[-1])

    # MongoDB
    await connect_mongo()
    mongo = get_mongo_db()
    await mongo.command("ping")
    logger.info("MongoDB connected: %s", settings.mongo_db)

    # Redis
    await connect_redis()
    redis = get_redis()
    await redis.ping()
    logger.info("Redis connected: %s", settings.redis_url)

    yield

    # ── Shutdown ───────────────────────────────────────────
    await close_redis()
    await close_mongo()
    await engine.dispose()
    await ts_engine.dispose()
    logger.info("All connections closed")


app = FastAPI(
    title="Levoit GEO Platform",
    version="0.1.0",
    description="Brand GEO Growth Flywheel — AI Search Visibility Monitoring",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ─────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "levoit-geo"}


# ── API Router mount point ─────────────────────────────────
from src.api.v1 import router as v1_router  # noqa: E402

app.include_router(v1_router, prefix="/api/v1")

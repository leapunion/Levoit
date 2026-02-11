"""FastAPI dependency injection for database connections."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.mongo import get_mongo_db
from src.db.postgres import get_db, get_ts_db
from src.db.redis import get_redis

# ── Type aliases for FastAPI Depends ───────────────────────


async def _get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session


async def _get_ts_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_ts_db():
        yield session


def _get_mongo() -> AsyncIOMotorDatabase:
    return get_mongo_db()


def _get_redis() -> Redis:
    return get_redis()


DbSession = Annotated[AsyncSession, Depends(_get_db)]
TsDbSession = Annotated[AsyncSession, Depends(_get_ts_db)]
MongoDb = Annotated[AsyncIOMotorDatabase, Depends(_get_mongo)]
RedisClient = Annotated[Redis, Depends(_get_redis)]

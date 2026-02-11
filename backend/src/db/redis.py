"""Async Redis client."""

import redis.asyncio as aioredis

from src.config import settings

pool: aioredis.Redis | None = None


async def connect_redis() -> None:
    global pool
    pool = aioredis.from_url(settings.redis_url, decode_responses=True)


async def close_redis() -> None:
    global pool
    if pool:
        await pool.aclose()


def get_redis() -> aioredis.Redis:
    assert pool is not None, "Redis not connected — call connect_redis() first"
    return pool

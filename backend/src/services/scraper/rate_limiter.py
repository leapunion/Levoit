"""Per-platform sliding window rate limiter backed by Redis sorted sets.

Algorithm:
    - Each platform has a Redis ZSET key: `rl:{platform}`
    - Members are unique request IDs (timestamp-based), scores are timestamps
    - To check: count members with score in [now - window, now]
    - If count < limit: add new member → allowed
    - Else: denied (or wait_and_acquire polls until a slot opens)
    - Expired members are pruned on each call (ZREMRANGEBYSCORE)
"""

import asyncio
import time
import uuid

from redis.asyncio import Redis

from src.config import settings

# Sliding window size in seconds (1 hour)
WINDOW_SECONDS = 3600


class PlatformRateLimiter:
    """Per-platform rate limiter using Redis ZSET sliding window."""

    def __init__(self, redis: Redis) -> None:
        self._redis = redis
        self._limits: dict[str, int] = {
            "chatgpt": settings.rate_limit_chatgpt,
            "perplexity": settings.rate_limit_perplexity,
            "google_ai": settings.rate_limit_google_ai,
        }

    def _key(self, platform: str) -> str:
        return f"rl:{platform}"

    def get_limit(self, platform: str) -> int:
        """Return the configured hourly limit for a platform."""
        return self._limits.get(platform, 10)

    async def acquire(self, platform: str) -> bool:
        """Try to acquire a rate limit slot.

        Returns True if the request is allowed, False if rate-limited.
        """
        key = self._key(platform)
        limit = self.get_limit(platform)
        now = time.time()
        window_start = now - WINDOW_SECONDS

        pipe = self._redis.pipeline(transaction=True)
        # Remove expired entries
        pipe.zremrangebyscore(key, 0, window_start)
        # Count current window entries
        pipe.zcard(key)
        results = await pipe.execute()

        current_count: int = results[1]

        if current_count >= limit:
            return False

        # Add new entry with unique member and timestamp score
        member = f"{now}:{uuid.uuid4().hex[:8]}"
        await self._redis.zadd(key, {member: now})
        # Set key expiry to auto-cleanup (window + buffer)
        await self._redis.expire(key, WINDOW_SECONDS + 60)
        return True

    async def wait_and_acquire(
        self, platform: str, timeout: float = 60.0, poll_interval: float = 1.0
    ) -> bool:
        """Block until a rate limit slot opens, or timeout.

        Returns True if acquired within timeout, False if timed out.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            if await self.acquire(platform):
                return True
            remaining = deadline - time.time()
            if remaining <= 0:
                break
            await asyncio.sleep(min(poll_interval, remaining))
        return False

    async def remaining(self, platform: str) -> int:
        """Return the number of remaining requests in the current window."""
        key = self._key(platform)
        limit = self.get_limit(platform)
        now = time.time()
        window_start = now - WINDOW_SECONDS

        # Prune and count
        await self._redis.zremrangebyscore(key, 0, window_start)
        current = await self._redis.zcard(key)
        return max(0, limit - current)

    async def reset(self, platform: str) -> None:
        """Reset the rate limit counter for a platform (testing/admin)."""
        await self._redis.delete(self._key(platform))

"""CostTracker — Redis-backed daily cost accumulator per R-PL-03.

Tracks cumulative API cost per day using Redis INCRBYFLOAT.
Key format: cost:daily:{YYYY-MM-DD}, TTL 48h.
Halts pipeline when daily budget exceeded.
"""

import logging
from datetime import datetime, timezone

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

# Key TTL: 48 hours (covers timezone edge cases)
_KEY_TTL_SECONDS = 48 * 3600


class CostTracker:
    """Tracks daily API costs in Redis and enforces budget limits."""

    def __init__(self, redis: Redis, daily_budget_usd: float = 10.0) -> None:
        self._redis = redis
        self._daily_budget = daily_budget_usd

    def _key(self) -> str:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return f"cost:daily:{today}"

    async def add(self, amount_usd: float) -> float:
        """Add cost and return new cumulative total for today.

        Args:
            amount_usd: Cost to add (must be >= 0).

        Returns:
            Updated daily total.
        """
        if amount_usd < 0:
            raise ValueError("Cost amount must be non-negative")

        key = self._key()
        new_total = await self._redis.incrbyfloat(key, amount_usd)
        # Set TTL only if this is the first write (TTL = -1 means no expiry set)
        ttl = await self._redis.ttl(key)
        if ttl == -1:
            await self._redis.expire(key, _KEY_TTL_SECONDS)

        logger.debug("Cost tracker: +$%.4f → $%.4f today", amount_usd, new_total)
        return float(new_total)

    async def get_today(self) -> float:
        """Return today's cumulative cost."""
        val = await self._redis.get(self._key())
        return float(val) if val else 0.0

    async def is_budget_exceeded(self) -> bool:
        """Check if today's cost has exceeded the daily budget."""
        return await self.get_today() >= self._daily_budget

    async def remaining_budget(self) -> float:
        """Return remaining budget for today."""
        spent = await self.get_today()
        return max(0.0, round(self._daily_budget - spent, 4))

    async def reset_today(self) -> None:
        """Reset today's cost counter (for testing / manual override)."""
        await self._redis.delete(self._key())

"""Tests for PlatformRateLimiter — Redis sliding window rate limiting."""

import time
from unittest.mock import patch

import fakeredis.aioredis
import pytest

from src.services.scraper.rate_limiter import WINDOW_SECONDS, PlatformRateLimiter


@pytest.fixture
def redis():
    """Create a fake async Redis instance."""
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def limiter(redis):
    """Create a rate limiter with low limits for testing."""
    rl = PlatformRateLimiter(redis)
    # Override limits for fast testing
    rl._limits = {
        "chatgpt": 3,
        "perplexity": 5,
        "google_ai": 2,
    }
    return rl


# ── Test: allows requests within limit ──────────────────────


class TestAcquire:
    @pytest.mark.asyncio
    async def test_allows_within_limit(self, limiter: PlatformRateLimiter) -> None:
        assert await limiter.acquire("chatgpt") is True
        assert await limiter.acquire("chatgpt") is True
        assert await limiter.acquire("chatgpt") is True

    @pytest.mark.asyncio
    async def test_blocks_exceeding_limit(self, limiter: PlatformRateLimiter) -> None:
        # Exhaust the limit (3 for chatgpt)
        for _ in range(3):
            assert await limiter.acquire("chatgpt") is True

        # 4th request should be blocked
        assert await limiter.acquire("chatgpt") is False
        assert await limiter.acquire("chatgpt") is False

    @pytest.mark.asyncio
    async def test_different_platforms_independent(self, limiter: PlatformRateLimiter) -> None:
        # Exhaust chatgpt (limit=3)
        for _ in range(3):
            await limiter.acquire("chatgpt")

        assert await limiter.acquire("chatgpt") is False
        # perplexity should still be available
        assert await limiter.acquire("perplexity") is True

    @pytest.mark.asyncio
    async def test_window_expiry_allows_new_requests(
        self, limiter: PlatformRateLimiter
    ) -> None:
        # Exhaust google_ai (limit=2)
        for _ in range(2):
            await limiter.acquire("google_ai")
        assert await limiter.acquire("google_ai") is False

        # Simulate time passing beyond the window
        future_time = time.time() + WINDOW_SECONDS + 1
        with patch("src.services.scraper.rate_limiter.time") as mock_time:
            mock_time.time.return_value = future_time
            # After window expires, should be allowed again
            assert await limiter.acquire("google_ai") is True

    @pytest.mark.asyncio
    async def test_unknown_platform_uses_default_limit(
        self, redis: fakeredis.aioredis.FakeRedis
    ) -> None:
        limiter = PlatformRateLimiter(redis)
        # Unknown platform gets default limit of 10
        assert limiter.get_limit("unknown_platform") == 10


# ── Test: remaining count ───────────────────────────────────


class TestRemaining:
    @pytest.mark.asyncio
    async def test_remaining_starts_at_limit(self, limiter: PlatformRateLimiter) -> None:
        assert await limiter.remaining("chatgpt") == 3

    @pytest.mark.asyncio
    async def test_remaining_decreases(self, limiter: PlatformRateLimiter) -> None:
        await limiter.acquire("chatgpt")
        assert await limiter.remaining("chatgpt") == 2
        await limiter.acquire("chatgpt")
        assert await limiter.remaining("chatgpt") == 1

    @pytest.mark.asyncio
    async def test_remaining_zero_when_exhausted(self, limiter: PlatformRateLimiter) -> None:
        for _ in range(3):
            await limiter.acquire("chatgpt")
        assert await limiter.remaining("chatgpt") == 0


# ── Test: wait_and_acquire ──────────────────────────────────


class TestWaitAndAcquire:
    @pytest.mark.asyncio
    async def test_immediate_acquire_if_available(self, limiter: PlatformRateLimiter) -> None:
        result = await limiter.wait_and_acquire("chatgpt", timeout=5.0)
        assert result is True

    @pytest.mark.asyncio
    async def test_timeout_when_exhausted(self, limiter: PlatformRateLimiter) -> None:
        # Exhaust google_ai (limit=2)
        for _ in range(2):
            await limiter.acquire("google_ai")

        # Should timeout quickly (1s timeout, no slots will open)
        start = time.monotonic()
        result = await limiter.wait_and_acquire(
            "google_ai", timeout=1.0, poll_interval=0.3
        )
        elapsed = time.monotonic() - start

        assert result is False
        assert elapsed >= 0.9  # Should have waited close to timeout


# ── Test: reset ─────────────────────────────────────────────


class TestReset:
    @pytest.mark.asyncio
    async def test_reset_clears_counter(self, limiter: PlatformRateLimiter) -> None:
        for _ in range(3):
            await limiter.acquire("chatgpt")
        assert await limiter.acquire("chatgpt") is False

        await limiter.reset("chatgpt")

        assert await limiter.remaining("chatgpt") == 3
        assert await limiter.acquire("chatgpt") is True

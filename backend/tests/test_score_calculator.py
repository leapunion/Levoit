"""Tests for ScoreCalculator and CostTracker."""

import pytest

import fakeredis.aioredis

from src.models.enums import Platform
from src.services.analyzer.cost_tracker import CostTracker
from src.services.analyzer.score_calculator import (
    PlatformRanking,
    calculate_competitive_gap,
    calculate_visibility_score,
)


# ── Fixtures ─────────────────────────────────────────────────


@pytest.fixture
def redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def cost_tracker(redis):
    return CostTracker(redis=redis, daily_budget_usd=10.0)


# ── ScoreCalculator tests ────────────────────────────────────


class TestVisibilityScore:
    def test_all_platforms_rank_1(self) -> None:
        """Brand ranked #1 on all platforms → maximum score."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=1),
            PlatformRanking(platform=Platform.perplexity, rank_position=1),
            PlatformRanking(platform=Platform.google_ai, rank_position=1),
        ]
        score = calculate_visibility_score(rankings)
        # 0.4*100 + 0.35*100 + 0.25*100 = 100.0
        assert score == 100.0

    def test_all_platforms_rank_0(self) -> None:
        """Brand not found on any platform → zero score."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=0),
            PlatformRanking(platform=Platform.perplexity, rank_position=0),
            PlatformRanking(platform=Platform.google_ai, rank_position=0),
        ]
        score = calculate_visibility_score(rankings)
        assert score == 0.0

    def test_mixed_rankings(self) -> None:
        """Different ranks across platforms → weighted sum."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=1),     # 0.4 * 100 = 40
            PlatformRanking(platform=Platform.perplexity, rank_position=3),   # 0.35 * 50 = 17.5
            PlatformRanking(platform=Platform.google_ai, rank_position=5),    # 0.25 * 15 = 3.75
        ]
        score = calculate_visibility_score(rankings)
        assert score == 61.25

    def test_partial_platforms(self) -> None:
        """Only some platforms present → proportional score."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=1),  # 0.4 * 100 = 40
        ]
        score = calculate_visibility_score(rankings)
        assert score == 40.0

    def test_empty_rankings(self) -> None:
        """No rankings → zero."""
        assert calculate_visibility_score([]) == 0.0

    def test_rank_2_scores(self) -> None:
        """Rank 2 across all platforms."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=2),     # 0.4 * 75 = 30
            PlatformRanking(platform=Platform.perplexity, rank_position=2),   # 0.35 * 75 = 26.25
            PlatformRanking(platform=Platform.google_ai, rank_position=2),    # 0.25 * 75 = 18.75
        ]
        score = calculate_visibility_score(rankings)
        assert score == 75.0

    def test_some_not_found(self) -> None:
        """Brand found on 2/3 platforms, not found on 1."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=2),     # 0.4 * 75 = 30
            PlatformRanking(platform=Platform.perplexity, rank_position=0),   # 0.35 * 0 = 0
            PlatformRanking(platform=Platform.google_ai, rank_position=1),    # 0.25 * 100 = 25
        ]
        score = calculate_visibility_score(rankings)
        assert score == 55.0

    def test_score_rounded_to_2_decimals(self) -> None:
        """Score should always be rounded to 2 decimal places."""
        rankings = [
            PlatformRanking(platform=Platform.chatgpt, rank_position=4),     # 0.4 * 30 = 12
            PlatformRanking(platform=Platform.perplexity, rank_position=3),   # 0.35 * 50 = 17.5
            PlatformRanking(platform=Platform.google_ai, rank_position=5),    # 0.25 * 15 = 3.75
        ]
        score = calculate_visibility_score(rankings)
        assert score == 33.25
        assert isinstance(score, float)


class TestCompetitiveGap:
    def test_levoit_leads(self) -> None:
        """Levoit score higher than all competitors → positive gap."""
        gap = calculate_competitive_gap(80.0, {"Dyson": 60.0, "Coway": 50.0})
        assert gap == 20.0

    def test_competitor_leads(self) -> None:
        """Competitor score higher → negative gap."""
        gap = calculate_competitive_gap(40.0, {"Dyson": 75.0, "Coway": 50.0})
        assert gap == -35.0

    def test_tied(self) -> None:
        """Same score → zero gap."""
        gap = calculate_competitive_gap(60.0, {"Dyson": 60.0})
        assert gap == 0.0

    def test_no_competitors(self) -> None:
        """No competitor scores → gap equals levoit_score."""
        gap = calculate_competitive_gap(55.0, {})
        assert gap == 55.0

    def test_multiple_competitors_uses_max(self) -> None:
        """Gap is vs the best competitor, not average."""
        gap = calculate_competitive_gap(70.0, {"Dyson": 80.0, "Coway": 30.0, "Honeywell": 50.0})
        assert gap == -10.0


# ── CostTracker tests ────────────────────────────────────────


class TestCostTracker:
    @pytest.mark.asyncio
    async def test_add_returns_cumulative(self, cost_tracker) -> None:
        """Adding costs should accumulate."""
        t1 = await cost_tracker.add(1.50)
        assert t1 == 1.50

        t2 = await cost_tracker.add(2.25)
        assert abs(t2 - 3.75) < 0.01

    @pytest.mark.asyncio
    async def test_get_today_starts_zero(self, cost_tracker) -> None:
        """Fresh day starts at zero."""
        assert await cost_tracker.get_today() == 0.0

    @pytest.mark.asyncio
    async def test_get_today_after_adds(self, cost_tracker) -> None:
        await cost_tracker.add(3.00)
        await cost_tracker.add(2.00)
        total = await cost_tracker.get_today()
        assert abs(total - 5.00) < 0.01

    @pytest.mark.asyncio
    async def test_budget_not_exceeded(self, cost_tracker) -> None:
        """Under budget → not exceeded."""
        await cost_tracker.add(5.00)
        assert await cost_tracker.is_budget_exceeded() is False

    @pytest.mark.asyncio
    async def test_budget_exceeded(self, cost_tracker) -> None:
        """At or over budget → exceeded."""
        await cost_tracker.add(10.00)
        assert await cost_tracker.is_budget_exceeded() is True

    @pytest.mark.asyncio
    async def test_budget_exceeded_over(self, cost_tracker) -> None:
        """Over budget → exceeded."""
        await cost_tracker.add(12.50)
        assert await cost_tracker.is_budget_exceeded() is True

    @pytest.mark.asyncio
    async def test_remaining_budget(self, cost_tracker) -> None:
        await cost_tracker.add(3.00)
        remaining = await cost_tracker.remaining_budget()
        assert abs(remaining - 7.00) < 0.01

    @pytest.mark.asyncio
    async def test_remaining_budget_zero_floor(self, cost_tracker) -> None:
        """Remaining never goes negative."""
        await cost_tracker.add(15.00)
        assert await cost_tracker.remaining_budget() == 0.0

    @pytest.mark.asyncio
    async def test_reset_clears_total(self, cost_tracker) -> None:
        await cost_tracker.add(5.00)
        await cost_tracker.reset_today()
        assert await cost_tracker.get_today() == 0.0

    @pytest.mark.asyncio
    async def test_negative_amount_rejected(self, cost_tracker) -> None:
        """Negative cost should raise ValueError."""
        with pytest.raises(ValueError, match="non-negative"):
            await cost_tracker.add(-1.0)

    @pytest.mark.asyncio
    async def test_key_has_ttl(self, cost_tracker, redis) -> None:
        """Redis key should have a TTL set."""
        await cost_tracker.add(1.0)
        # Find the key
        keys = await redis.keys("cost:daily:*")
        assert len(keys) == 1
        ttl = await redis.ttl(keys[0])
        assert ttl > 0
        assert ttl <= 48 * 3600

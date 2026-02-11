"""Score calculator — AI Visibility Score and Competitive Gap per R-RE-02, R-CC-02.

Visibility Score formula:
  score = Σ (platform_weight × position_score)

Platform weights: ChatGPT 0.40, Perplexity 0.35, Google AI 0.25
Position scores:  1→100, 2→75, 3→50, 4→30, 5→15, 0→0
"""

from dataclasses import dataclass

from src.models.enums import Platform

PLATFORM_WEIGHTS: dict[str, float] = {
    "chatgpt": 0.40,
    "perplexity": 0.35,
    "google_ai": 0.25,
}

POSITION_SCORES: dict[int, int] = {
    1: 100,
    2: 75,
    3: 50,
    4: 30,
    5: 15,
    0: 0,
}


@dataclass(frozen=True)
class PlatformRanking:
    """A single brand's rank on one platform (input to score calculation)."""

    platform: Platform
    rank_position: int  # 0-5


def calculate_visibility_score(rankings: list[PlatformRanking]) -> float:
    """Compute weighted visibility score from per-platform rankings.

    Args:
        rankings: One entry per platform for a single brand + query.

    Returns:
        Score in range [0, 100], rounded to 2 decimal places.
    """
    if not rankings:
        return 0.0

    total = 0.0
    for r in rankings:
        weight = PLATFORM_WEIGHTS.get(r.platform.value, 0.0)
        score = POSITION_SCORES.get(r.rank_position, 0)
        total += weight * score

    return round(total, 2)


def calculate_competitive_gap(
    levoit_score: float,
    competitor_scores: dict[str, float],
) -> float:
    """Compute competitive gap: positive = Levoit leads, negative = trailing.

    Args:
        levoit_score: Levoit's visibility score.
        competitor_scores: Mapping of competitor name → score.

    Returns:
        Gap value rounded to 2 decimal places.
    """
    if not competitor_scores:
        return round(levoit_score, 2)
    max_competitor = max(competitor_scores.values())
    return round(levoit_score - max_competitor, 2)

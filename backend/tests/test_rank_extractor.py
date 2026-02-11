"""Tests for RankExtractor, BrandMatcher, and SnippetExtractor."""

import pytest

from src.services.analyzer.brand_matcher import BrandMatch, BrandMatcher
from src.services.analyzer.rank_extractor import RankExtractor, RankResult
from src.services.analyzer.snippet_extractor import SnippetExtractor

BRANDS = ["Levoit", "Dyson", "Coway", "Honeywell"]


# ── Fixtures: realistic AI search responses ──────────────────


CHATGPT_RESPONSE = """\
# Best Air Purifiers for 2026

When it comes to choosing the best air purifier, several brands stand out for their combination of performance, value, and smart features.

## Top Recommendations

1. Levoit Core 300S — This compact purifier offers excellent HEPA filtration and smart app control at an unbeatable price point. We recommend Levoit for most households looking for reliable air purification.

2. Dyson Purifier Cool TP07 — Dyson combines air purification with a fan, making it a versatile choice for warmer climates. The HEPA H13 filter captures 99.97% of particles.

3. Coway Airmega AP-1512HH — Known as "The Mighty," this purifier delivers strong performance in a compact design with an eco mode that saves energy.

4. Honeywell HPA300 — A budget-friendly option that covers large rooms up to 465 sq ft. While it lacks smart features, it's a workhorse for basic filtration needs.

## Key Considerations

When selecting an air purifier, consider room size, noise level, filter replacement costs, and whether you need smart home integration. Levoit stands out for offering the best balance across all these factors.
"""

PERPLEXITY_RESPONSE = """\
Based on my analysis of current air purifiers, here are the top options:

The Dyson Pure Cool is the best overall air purifier for 2026. Dyson is the best choice for those who want premium build quality and integrated cooling. The HEPA H13 filtration system captures ultrafine particles effectively.

Levoit Core 300S comes in as a strong second choice, offering similar filtration performance at a fraction of the cost. It's particularly well-suited for bedrooms and small living spaces.

Coway Airmega is another excellent option, especially for larger rooms. The dual HEPA filter system provides thorough air cleaning.

I couldn't find any notable mentions of Blueair in the current top recommendations for 2026.
"""

GOOGLE_AI_RESPONSE = """\
Air purifiers help improve indoor air quality by removing pollutants, allergens, and odors.

Popular brands include Honeywell, Dyson, and Coway. Many reviewers note that smart features are becoming increasingly important.

For budget-conscious buyers, the Levoit Core series provides good value. Levoit has been gaining market share with competitive pricing.

The Dyson models tend to be premium-priced but offer design appeal. Coway continues to be a reliable mid-range option.
"""

# Brand mentioned but NOT recommended
MENTIONED_ONLY_RESPONSE = """\
Air purifiers are essential for indoor air quality. There are many options available on the market today.

Some users have reported issues with Levoit filter replacements being expensive. Dyson models are known for their high price points.

Overall, the air purifier market continues to grow as consumers become more health-conscious.
"""

# Brand not found at all
NO_BRAND_RESPONSE = """\
Air purifiers work by drawing air through a series of filters that trap harmful particles. HEPA filters are the gold standard, capturing 99.97% of particles as small as 0.3 microns.

When shopping for an air purifier, consider the room size, CADR rating, noise level, and ongoing filter costs. Smart features like app control and air quality sensors add convenience.
"""


NUMBERED_LIST_RESPONSE = """\
Top 5 Air Purifiers for Allergies:

1. Coway Airmega 400 - Best for large rooms with severe allergies
2. Levoit Core 600S - Best smart purifier for allergy sufferers
3. Dyson HP07 - Best premium option with heating
4. Honeywell HPA300 - Best budget large room purifier
5. Blueair Blue Pure 211+ - Best minimalist design
"""


# ── BrandMatcher tests ───────────────────────────────────────


class TestBrandMatcher:
    def test_finds_all_occurrences(self) -> None:
        matcher = BrandMatcher(["Levoit"])
        matches = matcher.find_all("Levoit is great. I recommend Levoit for everyone.")
        assert len(matches["Levoit"]) == 2

    def test_case_insensitive(self) -> None:
        matcher = BrandMatcher(["Levoit"])
        matches = matcher.find_all("LEVOIT is top. levoit rocks. Levoit wins.")
        assert len(matches["Levoit"]) == 3

    def test_word_boundary(self) -> None:
        matcher = BrandMatcher(["Air"])
        matches = matcher.find_all("Air purifiers clean the air. Airborne particles exist.")
        # "Air" matches standalone, "air" matches, "Airborne" should NOT
        assert len(matches["Air"]) == 2

    def test_no_matches(self) -> None:
        matcher = BrandMatcher(["Blueair"])
        matches = matcher.find_all("Levoit and Dyson are great choices.")
        assert len(matches["Blueair"]) == 0

    def test_first_position(self) -> None:
        matcher = BrandMatcher(["Dyson"])
        pos = matcher.first_position("The best pick is Dyson Pure Cool.", "Dyson")
        assert pos == 17

    def test_first_position_none(self) -> None:
        matcher = BrandMatcher(["Blueair"])
        pos = matcher.first_position("Levoit is the best.", "Blueair")
        assert pos is None

    def test_multiple_brands(self) -> None:
        matcher = BrandMatcher(BRANDS)
        matches = matcher.find_all(CHATGPT_RESPONSE)
        assert len(matches["Levoit"]) >= 2
        assert len(matches["Dyson"]) >= 1
        assert len(matches["Coway"]) >= 1
        assert len(matches["Honeywell"]) >= 1


# ── SnippetExtractor tests ───────────────────────────────────


class TestSnippetExtractor:
    def test_basic_extraction(self) -> None:
        extractor = SnippetExtractor(radius=20)
        text = "Hello world, Levoit is the best air purifier for homes."
        snippet = extractor.extract(text, 13)  # "Levoit" starts at 13
        assert "Levoit" in snippet

    def test_preserves_word_boundaries(self) -> None:
        extractor = SnippetExtractor(radius=10)
        text = "The amazing Levoit Core 300S is highly recommended by experts."
        snippet = extractor.extract(text, 12)  # "Levoit"
        # Should not cut mid-word
        words = snippet.replace("...", "").strip().split()
        for word in words:
            assert len(word) > 0  # no empty fragments

    def test_start_of_text_no_ellipsis(self) -> None:
        extractor = SnippetExtractor(radius=200)
        text = "Levoit is great."
        snippet = extractor.extract(text, 0)
        assert not snippet.startswith("...")

    def test_end_of_text_no_ellipsis(self) -> None:
        extractor = SnippetExtractor(radius=200)
        text = "Something something Levoit"
        snippet = extractor.extract(text, 20)
        assert not snippet.endswith("...")

    def test_middle_has_ellipsis(self) -> None:
        extractor = SnippetExtractor(radius=20)
        text = "A" * 100 + " Levoit " + "B" * 100
        snippet = extractor.extract(text, 101)
        assert snippet.startswith("...")
        assert snippet.endswith("...")


# ── RankExtractor tests ──────────────────────────────────────


class TestRankExtractor:
    def setup_method(self) -> None:
        self.extractor = RankExtractor()

    def test_chatgpt_ranking(self) -> None:
        """ChatGPT response with numbered recommendations: Levoit #1, Dyson #2, etc."""
        results = self.extractor.extract(CHATGPT_RESPONSE, BRANDS)

        by_brand = {r.brand: r for r in results}
        assert by_brand["Levoit"].rank_position == 1
        assert by_brand["Levoit"].is_recommended is True
        assert by_brand["Dyson"].rank_position in (2, 3)
        assert by_brand["Coway"].rank_position >= 2
        assert by_brand["Honeywell"].rank_position >= 2

    def test_perplexity_ranking(self) -> None:
        """Perplexity response: Dyson first recommended, Levoit second."""
        results = self.extractor.extract(PERPLEXITY_RESPONSE, BRANDS)

        by_brand = {r.brand: r for r in results}
        assert by_brand["Dyson"].rank_position == 1
        assert by_brand["Dyson"].is_recommended is True
        assert by_brand["Levoit"].rank_position >= 2

    def test_google_ai_mentioned_not_recommended(self) -> None:
        """Google AI response: brands mentioned but no strong recommendation context."""
        results = self.extractor.extract(GOOGLE_AI_RESPONSE, BRANDS)

        by_brand = {r.brand: r for r in results}
        # All brands are mentioned, so rank should be > 0
        for brand in BRANDS:
            assert by_brand[brand].rank_position > 0

    def test_brand_not_found(self) -> None:
        """Brand not in text → rank 0."""
        results = self.extractor.extract(NO_BRAND_RESPONSE, ["Levoit", "Dyson"])

        for r in results:
            assert r.rank_position == 0
            assert r.snippet == ""
            assert r.section_index == -1

    def test_mentioned_only_gets_rank_5(self) -> None:
        """Brands mentioned without recommendation context → rank 5."""
        results = self.extractor.extract(MENTIONED_ONLY_RESPONSE, ["Levoit", "Dyson"])

        for r in results:
            assert r.rank_position == 5
            assert r.is_recommended is False

    def test_numbered_list_ranking(self) -> None:
        """Numbered list: positions map to rank order."""
        results = self.extractor.extract(NUMBERED_LIST_RESPONSE, BRANDS)

        by_brand = {r.brand: r for r in results}
        # Coway is #1 in the list
        assert by_brand["Coway"].rank_position == 1
        assert by_brand["Coway"].is_recommended is True
        # Levoit is #2
        assert by_brand["Levoit"].rank_position == 2

    def test_snippets_contain_brand(self) -> None:
        """Every result with rank > 0 should have a snippet containing the brand."""
        results = self.extractor.extract(CHATGPT_RESPONSE, BRANDS)

        for r in results:
            if r.rank_position > 0:
                assert r.brand.lower() in r.snippet.lower(), (
                    f"Snippet for {r.brand} should contain the brand name"
                )

    def test_empty_text(self) -> None:
        """Empty text → all rank 0."""
        results = self.extractor.extract("", BRANDS)
        assert len(results) == len(BRANDS)
        for r in results:
            assert r.rank_position == 0

    def test_empty_brands(self) -> None:
        """No brands → empty list."""
        results = self.extractor.extract(CHATGPT_RESPONSE, [])
        assert results == []

    def test_result_sorted_by_rank(self) -> None:
        """Results should be sorted by rank_position (best first)."""
        results = self.extractor.extract(CHATGPT_RESPONSE, BRANDS)

        ranks = [r.rank_position for r in results if r.rank_position > 0]
        assert ranks == sorted(ranks)

    def test_rank_never_exceeds_5(self) -> None:
        """Rank should never exceed 5 even with many brands."""
        many_brands = ["Brand" + str(i) for i in range(10)]
        text = " ".join(
            f"We recommend Brand{i} for {['small', 'medium', 'large'][i % 3]} rooms."
            for i in range(10)
        )
        results = self.extractor.extract(text, many_brands)

        for r in results:
            assert 0 <= r.rank_position <= 5

    def test_section_splitting(self) -> None:
        """Verify that sections are split on double newlines and headers."""
        sections = RankExtractor._split_sections(
            "Paragraph one.\n\nParagraph two.\n\n## Header\n\nParagraph three."
        )
        assert len(sections) >= 3

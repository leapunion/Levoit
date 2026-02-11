"""RankExtractor — determine brand rank positions from AI search response text.

Algorithm (per plan Section 4.2):
  1. Split text into semantic sections (paragraphs / numbered lists / headers)
  2. For each brand:
     a. Find first occurrence position (section index)
     b. Check if brand is in "recommendation" context
     c. Assign rank based on recommendation order
     d. Extract ±200 char snippet
  3. Return list[RankResult]
"""

import logging
import re
from dataclasses import dataclass

from src.services.analyzer.brand_matcher import BrandMatcher
from src.services.analyzer.snippet_extractor import SnippetExtractor

logger = logging.getLogger(__name__)

# Patterns that indicate a brand is being *recommended* (not just mentioned)
_RECOMMENDATION_PATTERNS: list[str] = [
    r"(?:recommend|recommends|recommended)\s+(?:the\s+)?{brand}",
    r"{brand}\s+is\s+(?:the\s+)?(?:best|top|leading|number[- ]?one|#1|great|excellent|ideal)",
    r"(?:top\s+pick|best\s+(?:choice|option|pick)|our\s+(?:pick|choice|recommendation))[\s:]*{brand}",
    # Numbered list item at any position (1. Brand, 2. Brand, etc.)
    r"(?:^|\n)\s*\d+[.\):\s]+{brand}",
    r"(?:first|top)\s+(?:on\s+(?:the|our)\s+list|recommendation|choice).*?{brand}",
    r"{brand}.*?(?:stands?\s+out|leads?\s+the\s+pack|comes?\s+out\s+on\s+top)",
    r"(?:we|i)\s+(?:suggest|pick|choose|prefer)\s+(?:the\s+)?{brand}",
]


@dataclass(frozen=True)
class RankResult:
    """Extraction result for one brand within one scraped response."""

    brand: str
    rank_position: int  # 1-5 = ranked; 0 = not found
    snippet: str
    section_index: int  # which section the brand first appears in (-1 if absent)
    is_recommended: bool  # whether the brand appears in recommendation context


class RankExtractor:
    """Extracts brand rank positions from cleaned AI search text."""

    def __init__(self, snippet_radius: int = 200) -> None:
        self._snippet_extractor = SnippetExtractor(radius=snippet_radius)

    def extract(self, text: str, brands: list[str]) -> list[RankResult]:
        """Extract rank positions for all brands from text.

        Args:
            text: Cleaned text from the scrape processing layer.
            brands: List of brand names to search for.

        Returns:
            One RankResult per brand, sorted by rank_position (best first).
        """
        if not text or not brands:
            return [
                RankResult(brand=b, rank_position=0, snippet="", section_index=-1, is_recommended=False)
                for b in brands
            ]

        matcher = BrandMatcher(brands)
        sections = self._split_sections(text)

        # Phase 1: find each brand's first section index and recommendation status
        brand_info: list[dict] = []
        for brand in brands:
            first_section = self._find_first_section(sections, brand, matcher)
            is_rec = self._is_recommendation(text, brand)
            first_pos = matcher.first_position(text, brand)
            brand_info.append({
                "brand": brand,
                "section_index": first_section,
                "is_recommended": is_rec,
                "first_char_pos": first_pos,
            })

        # Phase 2: assign ranks — recommended brands first, by section order
        recommended = sorted(
            [b for b in brand_info if b["is_recommended"] and b["section_index"] >= 0],
            key=lambda b: b["section_index"],
        )
        mentioned_only = sorted(
            [b for b in brand_info if not b["is_recommended"] and b["section_index"] >= 0],
            key=lambda b: b["section_index"],
        )
        not_found = [b for b in brand_info if b["section_index"] < 0]

        rank_map: dict[str, int] = {}
        rank = 1
        for b in recommended:
            rank_map[b["brand"]] = min(rank, 5)
            rank += 1
        for b in mentioned_only:
            rank_map[b["brand"]] = 5  # mentioned but not recommended
        for b in not_found:
            rank_map[b["brand"]] = 0

        # Phase 3: build results with snippets
        results: list[RankResult] = []
        for info in brand_info:
            brand = info["brand"]
            char_pos = info["first_char_pos"]
            snippet = ""
            if char_pos is not None:
                snippet = self._snippet_extractor.extract(text, char_pos)

            results.append(RankResult(
                brand=brand,
                rank_position=rank_map[brand],
                snippet=snippet,
                section_index=info["section_index"],
                is_recommended=info["is_recommended"],
            ))

        # Sort by rank (best first), then alphabetically for ties
        results.sort(key=lambda r: (r.rank_position if r.rank_position > 0 else 999, r.brand))
        return results

    @staticmethod
    def _split_sections(text: str) -> list[str]:
        """Split text into semantic sections on double-newlines, headers, or numbered lists."""
        # Split on: blank lines, markdown headers, numbered list transitions
        raw_sections = re.split(r"\n\s*\n|\n(?=#{1,3}\s)|\n(?=\d+[.\)]\s)", text)
        return [s.strip() for s in raw_sections if s.strip()]

    @staticmethod
    def _find_first_section(sections: list[str], brand: str, matcher: BrandMatcher) -> int:
        """Return the index of the first section containing the brand, or -1."""
        pattern = re.compile(rf"\b{re.escape(brand)}\b", re.IGNORECASE)
        for i, section in enumerate(sections):
            if pattern.search(section):
                return i
        return -1

    @staticmethod
    def _is_recommendation(text: str, brand: str) -> bool:
        """Check if brand appears in a recommendation context."""
        for pattern_template in _RECOMMENDATION_PATTERNS:
            pattern_str = pattern_template.replace("{brand}", re.escape(brand))
            if re.search(pattern_str, text, re.IGNORECASE | re.MULTILINE):
                return True
        return False

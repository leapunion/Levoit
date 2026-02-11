"""BrandMatcher — case-insensitive brand name detection in text.

Handles common variants: "LEVOIT", "Levoit", "levoit", partial matches.
Returns match positions for downstream rank extraction.
"""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class BrandMatch:
    """A single occurrence of a brand in text."""

    brand: str
    start: int
    end: int


class BrandMatcher:
    """Finds brand occurrences in cleaned text (case-insensitive, word-boundary)."""

    def __init__(self, brands: list[str]) -> None:
        self._brands = brands
        # Pre-compile patterns with word boundaries for each brand
        self._patterns: dict[str, re.Pattern[str]] = {
            brand: re.compile(rf"\b{re.escape(brand)}\b", re.IGNORECASE)
            for brand in brands
        }

    def find_all(self, text: str) -> dict[str, list[BrandMatch]]:
        """Find all occurrences of each brand in text.

        Returns:
            Dict mapping brand name → list of BrandMatch (ordered by position).
        """
        result: dict[str, list[BrandMatch]] = {}
        for brand, pattern in self._patterns.items():
            matches = [
                BrandMatch(brand=brand, start=m.start(), end=m.end())
                for m in pattern.finditer(text)
            ]
            result[brand] = matches
        return result

    def first_position(self, text: str, brand: str) -> int | None:
        """Return the char offset of the first occurrence of brand, or None."""
        pattern = self._patterns.get(brand)
        if pattern is None:
            return None
        m = pattern.search(text)
        return m.start() if m else None

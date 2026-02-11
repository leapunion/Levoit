"""Perplexity AI platform scraper.

Targets Perplexity's search interface via Firecrawl.
"""

from urllib.parse import quote_plus

from src.models.enums import Platform
from src.services.scraper.base import AbstractPlatformScraper


class PerplexityScraper(AbstractPlatformScraper):
    """Scraper for Perplexity AI search results."""

    platform = Platform.perplexity

    def build_search_url(self, query: str) -> str:
        """Build Perplexity search URL."""
        encoded = quote_plus(query)
        return f"https://www.perplexity.ai/search?q={encoded}"

"""Google AI Overview platform scraper.

Targets Google search with AI Overview rendering via Firecrawl.
"""

from urllib.parse import quote_plus

from src.models.enums import Platform
from src.services.scraper.base import AbstractPlatformScraper


class GoogleAIScraper(AbstractPlatformScraper):
    """Scraper for Google AI Overview results."""

    platform = Platform.google_ai

    def build_search_url(self, query: str) -> str:
        """Build Google search URL that triggers AI Overview.

        Uses standard Google search — Firecrawl renders JS to capture
        the AI Overview section when present.
        """
        encoded = quote_plus(query)
        return f"https://www.google.com/search?q={encoded}"

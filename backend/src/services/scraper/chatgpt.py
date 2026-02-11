"""ChatGPT platform scraper.

Targets ChatGPT's search/web browsing interface via Firecrawl.
"""

from urllib.parse import quote_plus

from src.models.enums import Platform
from src.services.scraper.base import AbstractPlatformScraper


class ChatGPTScraper(AbstractPlatformScraper):
    """Scraper for ChatGPT search results."""

    platform = Platform.chatgpt

    def build_search_url(self, query: str) -> str:
        """Build ChatGPT search URL.

        Uses the ChatGPT search endpoint which renders web-browsing results.
        """
        encoded = quote_plus(query)
        return f"https://chatgpt.com/search?q={encoded}"

"""Processing layer — cleans Firecrawl output before passing to extractors.

Constitution requirement: MCP return values must go through the processing
layer before reaching AI or analysis services.

Token optimization: ~20KB raw → ~3KB processed (85% reduction).
"""

import hashlib
import re

from src.models.scrape_models import ProcessedContent, QuarantineError, ScrapeResult

# Maximum output length in characters (Token optimization)
MAX_CONTENT_CHARS = 10_000

# Minimum meaningful content length
MIN_CONTENT_CHARS = 50

# Patterns for HTML / boilerplate removal
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HTML_ENTITY_RE = re.compile(r"&[a-zA-Z]+;|&#\d+;")
_SCRIPT_STYLE_RE = re.compile(r"<(script|style|noscript)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")
_MULTI_SPACE_RE = re.compile(r"[ \t]{2,}")
_BOILERPLATE_KEYWORDS = [
    "skip to content", "skip to main",
    "cookie policy", "cookie consent", "cookie settings",
    "accept all cookies", "accept cookies",
    "privacy policy",
    "terms of service", "terms of use",
    "sign in", "sign up", "log in", "log out",
    "subscribe to", "newsletter",
    "advertisement", "sponsored",
    "all rights reserved",
]
_COPYRIGHT_RE = re.compile(r"©\s*\d{4}", re.IGNORECASE)


class ScrapeProcessor:
    """Cleans and validates Firecrawl scrape output.

    Pipeline:
        1. Strip <script>/<style> blocks
        2. Strip remaining HTML tags
        3. Decode HTML entities
        4. Remove navigation / boilerplate lines
        5. Collapse whitespace
        6. Validate minimum length
        7. Truncate to MAX_CONTENT_CHARS
        8. Compute SHA-256 content hash
    """

    def process(self, raw: ScrapeResult) -> ProcessedContent:
        """Process a raw scrape result into clean, validated content.

        Args:
            raw: Raw Firecrawl scrape result.

        Returns:
            ProcessedContent ready for rank extraction.

        Raises:
            QuarantineError: If content is empty, too short, or indicates an error page.
        """
        content = raw.content

        # Validate non-empty input
        if not content or not content.strip():
            raise QuarantineError(
                error_type="empty_content",
                error_detail="Scrape returned empty content",
                raw_content=content or "",
            )

        # Validate HTTP status
        if raw.status_code >= 400:
            raise QuarantineError(
                error_type="http_error",
                error_detail=f"HTTP {raw.status_code}",
                raw_content=content[:2000],
            )

        # Clean the content
        clean = self._strip_html(content)
        clean = self._remove_boilerplate(clean)
        clean = self._collapse_whitespace(clean)

        # Check for error page signatures (before length check so short
        # error pages get the correct error_type)
        self._check_error_page(clean, content)

        # Validate minimum length
        if len(clean) < MIN_CONTENT_CHARS:
            raise QuarantineError(
                error_type="insufficient_content",
                error_detail=f"Content too short after cleaning: {len(clean)} chars (min {MIN_CONTENT_CHARS})",
                raw_content=content[:2000],
            )

        # Truncate to budget
        if len(clean) > MAX_CONTENT_CHARS:
            clean = clean[:MAX_CONTENT_CHARS]

        # Compute content hash
        content_hash = hashlib.sha256(clean.encode("utf-8")).hexdigest()

        return ProcessedContent(
            clean_text=clean,
            content_hash=content_hash,
            char_count=len(clean),
            url=raw.url,
            status_code=raw.status_code,
            scraped_at=raw.scraped_at,
            scrape_duration_ms=raw.scrape_duration_ms,
        )

    def _strip_html(self, text: str) -> str:
        """Remove HTML tags, scripts, styles, and entities."""
        # Remove script/style blocks first (before stripping tags)
        text = _SCRIPT_STYLE_RE.sub("", text)
        # Strip remaining HTML tags
        text = _HTML_TAG_RE.sub(" ", text)
        # Decode common HTML entities
        text = _HTML_ENTITY_RE.sub(" ", text)
        return text

    def _remove_boilerplate(self, text: str) -> str:
        """Remove lines containing navigation, cookie banners, and common boilerplate."""
        lines = text.splitlines()
        filtered = []
        for line in lines:
            lower = line.lower().strip()
            if any(kw in lower for kw in _BOILERPLATE_KEYWORDS):
                continue
            if _COPYRIGHT_RE.search(line):
                continue
            filtered.append(line)
        return "\n".join(filtered)

    def _collapse_whitespace(self, text: str) -> str:
        """Normalize whitespace: collapse runs, trim lines."""
        text = _MULTI_SPACE_RE.sub(" ", text)
        # Trim each line
        lines = [line.strip() for line in text.splitlines()]
        # Remove empty lines, collapse multiple newlines
        text = "\n".join(line for line in lines if line)
        text = _MULTI_NEWLINE_RE.sub("\n\n", text)
        return text.strip()

    def _check_error_page(self, clean: str, raw: str) -> None:
        """Detect common error/block pages that look like valid content."""
        lower = clean.lower()
        error_signatures = [
            "access denied",
            "403 forbidden",
            "page not found",
            "404 not found",
            "captcha",
            "please verify you are a human",
            "rate limit exceeded",
            "too many requests",
        ]
        for sig in error_signatures:
            if sig in lower and len(clean) < 500:
                raise QuarantineError(
                    error_type="error_page",
                    error_detail=f"Detected error page signature: '{sig}'",
                    raw_content=raw[:2000],
                )

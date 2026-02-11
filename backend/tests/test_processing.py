"""Tests for ScrapeProcessor — processing layer validation."""

from datetime import datetime, timezone

import pytest

from src.models.scrape_models import QuarantineError, ScrapeResult
from src.services.scraper.processing import MAX_CONTENT_CHARS, ScrapeProcessor

processor = ScrapeProcessor()


# ── Fixture: typical Firecrawl HTML output ──────────────────


def _make_raw(content: str, status_code: int = 200, url: str = "https://example.com") -> ScrapeResult:
    return ScrapeResult(
        url=url,
        content=content,
        status_code=status_code,
        content_length=len(content),
        scrape_duration_ms=350,
        scraped_at=datetime(2026, 2, 10, tzinfo=timezone.utc),
    )


SAMPLE_CHATGPT_HTML = """
<html>
<head><title>ChatGPT Response</title>
<script>window.__analytics = {};</script>
<style>.nav { display: flex; }</style>
</head>
<body>
<nav>Skip to content | Sign in | Subscribe to newsletter</nav>
<div class="content">
<h1>Best Air Purifiers for 2026</h1>
<p>Here are the top air purifiers recommended by experts:</p>
<ol>
<li><strong>Levoit Core 300S</strong> — Best overall value. Excellent HEPA filtration
with smart app control. Covers up to 1,095 sq ft.</li>
<li><strong>Dyson Purifier Big Quiet</strong> — Premium option with whole-room purification.
Expensive but effective for large spaces.</li>
<li><strong>Coway Airmega 400</strong> — Great for large rooms. Dual HEPA filtration
with smart sensor.</li>
<li><strong>Honeywell HPA300</strong> — Budget-friendly with solid HEPA performance.
Covers up to 465 sq ft.</li>
</ol>
<p>When choosing an air purifier, consider room size, noise level, and filter costs.</p>
</div>
<footer>© 2026 Example Corp. All rights reserved. Privacy policy | Terms of service</footer>
</body>
</html>
"""

SAMPLE_PERPLEXITY_MARKDOWN = """
# Best Air Purifiers in 2026

Based on extensive testing and expert reviews, here are our top picks:

## 1. Levoit Core 300S
The Levoit Core 300S remains the best value air purifier. It features
a true HEPA filter that captures 99.97% of particles. The VeSync app
integration allows remote control and scheduling.

**Pros:** Affordable, quiet, smart features
**Cons:** Smaller coverage area

## 2. Dyson Purifier Big Quiet Formaldehyde
Dyson's latest offering combines air purification with formaldehyde
destruction. The sealed HEPA H13 filter captures ultrafine particles.

## 3. Coway Airmega 400
Coway continues to impress with the Airmega 400's dual filtration
and real-time air quality monitoring.

Sources: [Wirecutter](https://wirecutter.com) [Consumer Reports](https://consumerreports.org)
"""

SAMPLE_GOOGLE_AI_HTML = """
<div class="ai-overview">
<p>According to multiple expert reviews, the <b>Levoit Core 300S</b> is frequently
recommended as the best value air purifier. It offers HEPA filtration at an
affordable price point.</p>
<p>For larger rooms, experts recommend the <b>Coway Airmega 400</b> or the
premium <b>Dyson Purifier Big Quiet</b>.</p>
<p><b>Honeywell HPA300</b> is noted as a reliable budget option.</p>
<div class="sources">
<a href="https://wirecutter.com">Wirecutter</a>
<a href="https://rtings.com">RTINGS</a>
</div>
</div>
"""


# ── Test: successful processing ─────────────────────────────


class TestProcessSuccess:
    def test_chatgpt_html_cleaned(self) -> None:
        result = processor.process(_make_raw(SAMPLE_CHATGPT_HTML))
        # HTML tags removed
        assert "<" not in result.clean_text
        assert ">" not in result.clean_text
        # Script/style content removed
        assert "window.__analytics" not in result.clean_text
        assert ".nav { display" not in result.clean_text
        # Boilerplate removed
        assert "Skip to content" not in result.clean_text
        assert "All rights reserved" not in result.clean_text
        # Meaningful content preserved
        assert "Levoit Core 300S" in result.clean_text
        assert "Dyson" in result.clean_text
        assert "Coway" in result.clean_text
        assert "Best Air Purifiers" in result.clean_text

    def test_perplexity_markdown_cleaned(self) -> None:
        result = processor.process(_make_raw(SAMPLE_PERPLEXITY_MARKDOWN))
        assert "Levoit Core 300S" in result.clean_text
        assert "Dyson" in result.clean_text
        assert result.char_count > 0
        assert len(result.content_hash) == 64  # SHA-256 hex

    def test_google_ai_html_cleaned(self) -> None:
        result = processor.process(_make_raw(SAMPLE_GOOGLE_AI_HTML))
        assert "Levoit Core 300S" in result.clean_text
        assert "Coway Airmega 400" in result.clean_text
        # HTML links stripped
        assert "<a " not in result.clean_text

    def test_content_hash_deterministic(self) -> None:
        r1 = processor.process(_make_raw(SAMPLE_CHATGPT_HTML))
        r2 = processor.process(_make_raw(SAMPLE_CHATGPT_HTML))
        assert r1.content_hash == r2.content_hash

    def test_content_hash_differs_for_different_input(self) -> None:
        r1 = processor.process(_make_raw(SAMPLE_CHATGPT_HTML))
        r2 = processor.process(_make_raw(SAMPLE_PERPLEXITY_MARKDOWN))
        assert r1.content_hash != r2.content_hash

    def test_metadata_preserved(self) -> None:
        result = processor.process(_make_raw(
            SAMPLE_CHATGPT_HTML, url="https://chat.openai.com/search?q=test"
        ))
        assert result.url == "https://chat.openai.com/search?q=test"
        assert result.status_code == 200
        assert result.scrape_duration_ms == 350


# ── Test: truncation ────────────────────────────────────────


class TestTruncation:
    def test_output_under_max_chars(self) -> None:
        result = processor.process(_make_raw(SAMPLE_CHATGPT_HTML))
        assert result.char_count <= MAX_CONTENT_CHARS

    def test_long_content_truncated(self) -> None:
        long_content = "This is a meaningful paragraph about air purifiers. " * 500
        result = processor.process(_make_raw(long_content))
        assert result.char_count <= MAX_CONTENT_CHARS
        assert len(result.clean_text) <= MAX_CONTENT_CHARS


# ── Test: quarantine errors ─────────────────────────────────


class TestQuarantine:
    def test_empty_content_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="empty_content"):
            processor.process(_make_raw(""))

    def test_whitespace_only_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="empty_content"):
            processor.process(_make_raw("   \n\n\t  "))

    def test_http_error_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="http_error") as exc_info:
            processor.process(_make_raw("<h1>Not Found</h1>", status_code=404))
        assert "404" in exc_info.value.error_detail

    def test_too_short_after_cleaning_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="insufficient_content"):
            processor.process(_make_raw("<div><script>lots of js</script>Hi</div>"))

    def test_captcha_page_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="error_page"):
            processor.process(_make_raw("Please verify you are a human. Complete the captcha below."))

    def test_access_denied_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="error_page"):
            processor.process(_make_raw("Access Denied. You do not have permission."))

    def test_rate_limit_page_rejected(self) -> None:
        with pytest.raises(QuarantineError, match="error_page"):
            processor.process(_make_raw("Rate limit exceeded. Please try again later."))

    def test_quarantine_error_has_raw_content(self) -> None:
        with pytest.raises(QuarantineError) as exc_info:
            processor.process(_make_raw("", status_code=200))
        assert exc_info.value.error_type == "empty_content"
        assert isinstance(exc_info.value.raw_content, str)

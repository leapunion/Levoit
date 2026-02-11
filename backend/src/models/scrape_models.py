"""Data models for the scraping and processing pipeline."""

from datetime import datetime

from pydantic import BaseModel, Field


class ScrapeResult(BaseModel):
    """Raw result returned from a Firecrawl scrape call."""

    url: str = Field(..., description="Scraped URL")
    content: str = Field(..., description="Raw HTML/markdown content from Firecrawl")
    status_code: int = Field(200, description="HTTP status code")
    content_length: int = Field(0, description="Original content byte length")
    scrape_duration_ms: int = Field(0, description="Scrape duration in milliseconds")
    scraped_at: datetime = Field(default_factory=datetime.utcnow, description="Scrape timestamp")


class ProcessedContent(BaseModel):
    """Cleaned, validated content ready for rank extraction."""

    clean_text: str = Field(..., description="Cleaned plain text (HTML stripped)")
    content_hash: str = Field(..., description="SHA-256 hash of clean_text for dedup")
    char_count: int = Field(..., description="Character count of clean_text")
    url: str = Field(..., description="Original URL")
    status_code: int = Field(..., description="HTTP status code")
    scraped_at: datetime = Field(..., description="Original scrape timestamp")
    scrape_duration_ms: int = Field(0, description="Scrape duration in milliseconds")
    snapshot_id: str | None = Field(None, description="MongoDB ObjectId of the stored snapshot")
    is_duplicate: bool = Field(False, description="True if content_hash matches a recent scrape")


class QuarantineError(Exception):
    """Raised when scrape content fails validation and should be quarantined."""

    def __init__(self, error_type: str, error_detail: str, raw_content: str = "") -> None:
        self.error_type = error_type
        self.error_detail = error_detail
        self.raw_content = raw_content
        super().__init__(f"{error_type}: {error_detail}")

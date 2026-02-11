"""Shared enumerations for visibility monitoring."""

from enum import StrEnum


class Platform(StrEnum):
    chatgpt = "chatgpt"
    perplexity = "perplexity"
    google_ai = "google_ai"


class QueryPriority(StrEnum):
    high = "high"
    medium = "medium"
    low = "low"


class QueryCategory(StrEnum):
    product_comparison = "product_comparison"
    brand_search = "brand_search"
    category_search = "category_search"
    general = "general"


class PipelineStatus(StrEnum):
    running = "running"
    completed = "completed"
    failed = "failed"
    cost_halted = "cost_halted"


class ScorePeriod(StrEnum):
    raw = "raw"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

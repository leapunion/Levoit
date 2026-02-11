"""Pydantic request/response schemas for visibility API."""

from datetime import datetime

from pydantic import BaseModel, Field

from src.models.enums import Platform, QueryCategory, QueryPriority, ScorePeriod


# ── Query schemas ──────────────────────────────────────────


class VisQueryCreate(BaseModel):
    query_text: str = Field(..., max_length=500, description="Search query to monitor")
    category: QueryCategory = Field(QueryCategory.general, description="Query category")
    priority: QueryPriority = Field(QueryPriority.medium, description="Monitoring priority")
    brands: list[str] = Field(
        default=["Levoit", "Dyson", "Coway", "Honeywell"],
        description="Brands to track in results",
    )


class VisQueryUpdate(BaseModel):
    query_text: str | None = Field(None, max_length=500, description="Updated query text")
    category: QueryCategory | None = Field(None, description="Updated category")
    priority: QueryPriority | None = Field(None, description="Updated priority")
    brands: list[str] | None = Field(None, description="Updated brand list")
    is_active: bool | None = Field(None, description="Enable or disable monitoring")


class VisQueryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int = Field(..., description="Query ID")
    query_text: str = Field(..., description="Search query text")
    category: QueryCategory = Field(..., description="Query category")
    priority: QueryPriority = Field(..., description="Monitoring priority")
    brands: list[str] = Field(..., description="Tracked brands")
    is_active: bool = Field(..., description="Whether monitoring is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    latest_score: float | None = Field(None, description="Most recent visibility score")


# ── Ranking schemas ────────────────────────────────────────


class RankingResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int = Field(..., description="Ranking record ID")
    query_id: int = Field(..., description="Associated query ID")
    platform: Platform = Field(..., description="AI search platform")
    brand: str = Field(..., description="Brand name")
    rank_position: int = Field(..., ge=0, le=10, description="Rank position (0=not found, 1-5)")
    snippet: str | None = Field(None, description="Context snippet around brand mention")
    source_urls: list[str] | None = Field(None, description="Source URLs cited")
    snapshot_id: str | None = Field(None, description="MongoDB snapshot ObjectId")
    scraped_at: datetime = Field(..., description="Scrape timestamp")
    pipeline_run_id: int | None = Field(None, description="Pipeline run ID")


# ── Score schemas ──────────────────────────────────────────


class ScoreResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int = Field(..., description="Score record ID")
    query_id: int = Field(..., description="Associated query ID")
    brand: str = Field(..., description="Brand name")
    visibility_score: float = Field(..., ge=0, le=100, description="Visibility score (0-100)")
    competitive_gap: float | None = Field(
        None, description="Gap vs top competitor (positive=leading)"
    )
    period: ScorePeriod = Field(..., description="Aggregation period")
    computed_at: datetime = Field(..., description="Computation timestamp")


# ── Trend schemas ──────────────────────────────────────────


class TrendPoint(BaseModel):
    timestamp: datetime = Field(..., description="Time bucket start")
    brand: str = Field(..., description="Brand name")
    avg_rank: float = Field(..., description="Average rank position in period")
    avg_score: float = Field(..., description="Average visibility score in period")
    sample_count: int = Field(..., description="Number of data points in period")


# ── Comparison schemas ─────────────────────────────────────


class ComparisonRow(BaseModel):
    query_id: int = Field(..., description="Query ID")
    query_text: str = Field(..., description="Query text")
    levoit_score: float = Field(..., ge=0, le=100, description="Levoit visibility score")
    dyson_score: float = Field(0.0, ge=0, le=100, description="Dyson visibility score")
    coway_score: float = Field(0.0, ge=0, le=100, description="Coway visibility score")
    honeywell_score: float = Field(0.0, ge=0, le=100, description="Honeywell visibility score")
    competitive_gap: float = Field(..., description="Levoit gap vs best competitor")


# ── Pipeline schemas ───────────────────────────────────────


class PipelineRunResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int = Field(..., description="Pipeline run ID")
    flow_name: str = Field(..., description="Pipeline flow name")
    status: str = Field(..., description="Execution status")
    queries_total: int = Field(..., description="Total queries processed")
    success_count: int = Field(..., description="Successful scrapes")
    failure_count: int = Field(..., description="Failed scrapes")
    quarantine_count: int = Field(..., description="Quarantined results")
    cost_usd: float = Field(..., description="Estimated cost in USD")
    duration_sec: float | None = Field(None, description="Duration in seconds")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: datetime | None = Field(None, description="Completion timestamp")

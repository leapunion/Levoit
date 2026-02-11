"""SQLAlchemy ORM models for AI Search Visibility Monitoring."""

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Float, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from src.db.postgres import Base


class VisQuery(Base):
    """Monitored search query configuration."""

    __tablename__ = "vis_query"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    query_text: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="general",
    )
    priority: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="medium",
    )
    brands: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        server_default='["Levoit","Dyson","Coway","Honeywell"]',
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default="now()"
    )

    __table_args__ = (
        Index("idx_vis_query_active_priority", "is_active", "priority"),
    )


class VisBrand(Base):
    """Tracked brand entity."""

    __tablename__ = "vis_brand"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default="now()"
    )


class VisRanking(Base):
    """Single ranking result per scrape / platform / brand."""

    __tablename__ = "vis_ranking"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    query_id: Mapped[int] = mapped_column(
        Integer, nullable=False, index=False  # covered by composite indexes
    )
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_urls: Mapped[list | None] = mapped_column(JSONB, server_default="[]")
    snapshot_id: Mapped[str | None] = mapped_column(String(24), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default="now()"
    )
    pipeline_run_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_vis_ranking_query_time", "query_id", scraped_at.desc()),
        Index("idx_vis_ranking_brand_time", "brand", scraped_at.desc()),
    )


class VisScore(Base):
    """Aggregated visibility score per query / brand."""

    __tablename__ = "vis_score"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    query_id: Mapped[int] = mapped_column(Integer, nullable=False)
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    visibility_score: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    competitive_gap: Mapped[float | None] = mapped_column(Float, nullable=True)
    period: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="raw",
    )
    computed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default="now()"
    )

    __table_args__ = (
        Index("idx_vis_score_query_brand", "query_id", "brand", computed_at.desc()),
    )


class VisPipelineRun(Base):
    """Pipeline execution log entry."""

    __tablename__ = "vis_pipeline_run"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flow_name: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="running",
    )
    queries_total: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    success_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    failure_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    quarantine_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, server_default="0")
    duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default="now()"
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

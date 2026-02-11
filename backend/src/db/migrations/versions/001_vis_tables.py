"""Create visibility monitoring tables.

Revision ID: 001
Revises:
Create Date: 2026-02-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vis_query ──────────────────────────────────────────
    op.create_table(
        "vis_query",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("query_text", sa.String(500), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="general"),
        sa.Column("priority", sa.String(10), nullable=False, server_default="medium"),
        sa.Column("brands", JSONB, nullable=False, server_default='["Levoit","Dyson","Coway","Honeywell"]'),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_vis_query_active_priority", "vis_query", ["is_active", "priority"])

    # ── vis_brand ──────────────────────────────────────────
    op.create_table(
        "vis_brand",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # ── vis_ranking ────────────────────────────────────────
    op.create_table(
        "vis_ranking",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("query_id", sa.Integer(), sa.ForeignKey("vis_query.id"), nullable=False),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("rank_position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("snippet", sa.Text(), nullable=True),
        sa.Column("source_urls", JSONB, server_default=sa.text("'[]'::jsonb")),
        sa.Column("snapshot_id", sa.String(24), nullable=True),
        sa.Column("scraped_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("pipeline_run_id", sa.Integer(), nullable=True),
    )
    op.create_index("idx_vis_ranking_query_time", "vis_ranking", ["query_id", sa.text("scraped_at DESC")])
    op.create_index("idx_vis_ranking_brand_time", "vis_ranking", ["brand", sa.text("scraped_at DESC")])

    # ── vis_score ──────────────────────────────────────────
    op.create_table(
        "vis_score",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("query_id", sa.Integer(), sa.ForeignKey("vis_query.id"), nullable=False),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("visibility_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("competitive_gap", sa.Float(), nullable=True),
        sa.Column("period", sa.String(10), nullable=False, server_default="raw"),
        sa.Column("computed_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_vis_score_query_brand", "vis_score", ["query_id", "brand", sa.text("computed_at DESC")])

    # ── vis_pipeline_run ───────────────────────────────────
    op.create_table(
        "vis_pipeline_run",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("flow_name", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="running"),
        sa.Column("queries_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quarantine_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Float(), nullable=False, server_default="0"),
        sa.Column("duration_sec", sa.Float(), nullable=True),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("vis_pipeline_run")
    op.drop_table("vis_score")
    op.drop_table("vis_ranking")
    op.drop_table("vis_brand")
    op.drop_table("vis_query")

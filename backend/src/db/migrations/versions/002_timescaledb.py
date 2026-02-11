"""Create TimescaleDB hypertable, continuous aggregate, and retention policy.

Revision ID: 002
Revises: 001
Create Date: 2026-02-10

NOTE: This migration runs against the levoit_ts database.
      It uses raw SQL because TimescaleDB functions are not
      supported by Alembic's standard operations.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from src.config import settings

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Connect to TimescaleDB via raw connection
    ts_url = settings.timescale_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    bind = sa.create_engine(ts_url)

    with bind.connect() as conn:
        # Ensure TimescaleDB extension
        conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"))
        conn.commit()

        # ── ts_search_rank hypertable ──────────────────────
        conn.execute(sa.text("""
            CREATE TABLE IF NOT EXISTS ts_search_rank (
                time              TIMESTAMPTZ  NOT NULL,
                query_id          INTEGER      NOT NULL,
                platform          VARCHAR(20)  NOT NULL,
                brand             VARCHAR(100) NOT NULL,
                rank_position     INTEGER      NOT NULL DEFAULT 0,
                visibility_score  FLOAT        NOT NULL DEFAULT 0
            )
        """))
        conn.commit()

        conn.execute(sa.text(
            "SELECT create_hypertable('ts_search_rank', 'time', if_not_exists => TRUE)"
        ))
        conn.commit()

        conn.execute(sa.text(
            "CREATE INDEX IF NOT EXISTS idx_ts_rank_query ON ts_search_rank(query_id, time DESC)"
        ))
        conn.commit()

        # ── Continuous aggregate: ts_daily_rank ────────────
        conn.execute(sa.text("""
            CREATE MATERIALIZED VIEW IF NOT EXISTS ts_daily_rank
            WITH (timescaledb.continuous) AS
            SELECT
                time_bucket('1 day', time) AS day,
                query_id,
                brand,
                AVG(rank_position)     AS avg_rank,
                AVG(visibility_score)  AS avg_score,
                COUNT(*)               AS sample_count
            FROM ts_search_rank
            GROUP BY day, query_id, brand
            WITH NO DATA
        """))
        conn.commit()

        conn.execute(sa.text("""
            SELECT add_continuous_aggregate_policy('ts_daily_rank',
                start_offset  => INTERVAL '3 days',
                end_offset    => INTERVAL '1 hour',
                schedule_interval => INTERVAL '1 hour',
                if_not_exists => TRUE
            )
        """))
        conn.commit()

        # ── Retention policy: 1 year ──────────────────────
        conn.execute(sa.text("""
            SELECT add_retention_policy('ts_search_rank',
                INTERVAL '1 year',
                if_not_exists => TRUE
            )
        """))
        conn.commit()

    bind.dispose()


def downgrade() -> None:
    ts_url = settings.timescale_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    bind = sa.create_engine(ts_url)

    with bind.connect() as conn:
        conn.execute(sa.text("DROP MATERIALIZED VIEW IF EXISTS ts_daily_rank CASCADE"))
        conn.commit()
        conn.execute(sa.text("DROP TABLE IF EXISTS ts_search_rank CASCADE"))
        conn.commit()

    bind.dispose()

"""Application configuration via Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ────────────────────────────────────────────────
    app_env: str = Field("development", description="Runtime environment")
    app_debug: bool = Field(True, description="Enable debug mode")
    log_level: str = Field("INFO", description="Logging level")

    # ── PostgreSQL ─────────────────────────────────────────
    database_url: str = Field(
        "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_geo",
        description="Async SQLAlchemy connection string for main DB",
    )
    timescale_url: str = Field(
        "postgresql+asyncpg://levoit:levoit_dev@localhost:5432/levoit_ts",
        description="Async SQLAlchemy connection string for TimescaleDB",
    )

    # ── MongoDB ────────────────────────────────────────────
    mongo_url: str = Field(
        "mongodb://localhost:27017/levoit_geo",
        description="MongoDB connection string",
    )
    mongo_db: str = Field("levoit_geo", description="MongoDB database name")

    # ── Redis ──────────────────────────────────────────────
    redis_url: str = Field(
        "redis://localhost:6379/2",
        description="Redis connection string",
    )

    # ── Firecrawl ──────────────────────────────────────────
    firecrawl_url: str = Field(
        "http://localhost:3002",
        description="Firecrawl self-hosted URL",
    )

    # ── Rate Limits (requests per hour) ────────────────────
    rate_limit_chatgpt: int = Field(10, description="ChatGPT requests/hour")
    rate_limit_perplexity: int = Field(20, description="Perplexity requests/hour")
    rate_limit_google_ai: int = Field(15, description="Google AI requests/hour")

    # ── Cost Control ───────────────────────────────────────
    daily_cost_budget_usd: float = Field(10.0, description="Daily cost budget in USD")


settings = Settings()

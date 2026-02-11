"""Async SQLAlchemy engines and session factories for PostgreSQL + TimescaleDB."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config import settings

# ── Main PostgreSQL engine (levoit_geo) ────────────────────
engine = create_async_engine(
    settings.database_url,
    echo=settings.app_debug,
    pool_size=5,
    max_overflow=10,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── TimescaleDB engine (levoit_ts) ─────────────────────────
ts_engine = create_async_engine(
    settings.timescale_url,
    echo=settings.app_debug,
    pool_size=5,
    max_overflow=10,
)

ts_async_session = async_sessionmaker(ts_engine, class_=AsyncSession, expire_on_commit=False)


# ── Declarative base ───────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Session generators ─────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


async def get_ts_db() -> AsyncGenerator[AsyncSession, None]:
    async with ts_async_session() as session:
        yield session

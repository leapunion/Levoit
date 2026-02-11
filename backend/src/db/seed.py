"""Seed script — populate all tables with realistic sample data.

Usage: uv run python -m src.db.seed
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings

# ── Constants ─────────────────────────────────────────────

BRANDS = ["Levoit", "Dyson", "Coway", "Honeywell"]
PLATFORMS = ["chatgpt", "perplexity", "google_ai"]

QUERIES = [
    # product_comparison
    {"text": "best air purifier 2025", "category": "product_comparison", "priority": "high"},
    {"text": "levoit vs dyson air purifier", "category": "product_comparison", "priority": "high"},
    {"text": "top rated HEPA air purifiers", "category": "product_comparison", "priority": "medium"},
    # brand_search
    {"text": "is levoit a good brand", "category": "brand_search", "priority": "high"},
    {"text": "levoit core 300s review", "category": "brand_search", "priority": "medium"},
    # category_search
    {"text": "air purifier for allergies", "category": "category_search", "priority": "medium"},
    {"text": "air purifier for pet owners", "category": "category_search", "priority": "low"},
    {"text": "small room air purifier", "category": "category_search", "priority": "low"},
    # general
    {"text": "do air purifiers really work", "category": "general", "priority": "low"},
    {"text": "how to choose an air purifier", "category": "general", "priority": "low"},
]

SNIPPETS = {
    "Levoit": [
        "The Levoit Core 300S is widely praised for its excellent performance in a compact design.",
        "Levoit stands out with its True HEPA H13 filtration and quiet operation under 24dB.",
        "Among budget-friendly options, Levoit consistently ranks as a top pick for small rooms.",
    ],
    "Dyson": [
        "Dyson's bladeless purifiers combine air purification with cooling fan functionality.",
        "The Dyson Purifier Cool TP07 features a sealed HEPA H13 filter with real-time air quality display.",
        "Dyson purifiers are premium-priced but offer smart home integration and app control.",
    ],
    "Coway": [
        "Coway's Airmega series provides excellent coverage for large rooms up to 1,560 sq. ft.",
        "The Coway AP-1512HH Mighty has been an Amazon best-seller for its value-to-performance ratio.",
        "Coway purifiers feature a 4-stage filtration system including a pre-filter and activated carbon.",
    ],
    "Honeywell": [
        "Honeywell HPA300 is designed for extra-large rooms up to 465 sq. ft. with turbo clean setting.",
        "Honeywell purifiers are known for their durable build and widely available replacement filters.",
        "The Honeywell AirGenius 5 offers washable filters, reducing long-term maintenance costs.",
    ],
}


def _rand_rank(brand: str, platform: str, day_offset: int) -> int:
    """Generate a somewhat realistic rank with brand/platform bias."""
    base = {
        "Levoit": {"chatgpt": 1, "perplexity": 2, "google_ai": 2},
        "Dyson": {"chatgpt": 2, "perplexity": 1, "google_ai": 3},
        "Coway": {"chatgpt": 3, "perplexity": 3, "google_ai": 1},
        "Honeywell": {"chatgpt": 4, "perplexity": 4, "google_ai": 4},
    }
    b = base.get(brand, {}).get(platform, 3)
    # Add some random jitter ± 1, clip to 0-5
    jitter = random.randint(-1, 1)
    # Occasionally not found
    if random.random() < 0.05:
        return 0
    return max(1, min(5, b + jitter))


def _score_from_rank(rank: int) -> float:
    """Convert rank (1-5) to visibility score (0-100)."""
    if rank == 0:
        return 0.0
    raw = 100 - (rank - 1) * 20 + random.uniform(-5, 5)
    return round(max(0.0, min(100.0, raw)), 1)


async def seed() -> None:
    """Populate PostgreSQL + TimescaleDB + MongoDB with sample data."""
    print("Connecting to PostgreSQL...")
    pg_engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

    print("Connecting to TimescaleDB...")
    ts_engine = create_async_engine(settings.timescale_url, echo=False)
    ts_factory = async_sessionmaker(ts_engine, class_=AsyncSession, expire_on_commit=False)

    print("Connecting to MongoDB...")
    mongo_client = AsyncIOMotorClient(settings.mongo_url)
    mongo_db = mongo_client[settings.mongo_db]

    now = datetime.now(timezone.utc)

    # ── Clean existing data ────────────────────────────────
    print("Cleaning existing data...")
    async with pg_engine.begin() as conn:
        await conn.execute(text("DELETE FROM vis_score"))
        await conn.execute(text("DELETE FROM vis_ranking"))
        await conn.execute(text("DELETE FROM vis_pipeline_run"))
        await conn.execute(text("DELETE FROM vis_brand"))
        await conn.execute(text("DELETE FROM vis_query"))
        await conn.execute(text("ALTER SEQUENCE vis_query_id_seq RESTART WITH 1"))
        await conn.execute(text("ALTER SEQUENCE vis_brand_id_seq RESTART WITH 1"))

    async with ts_engine.begin() as conn:
        await conn.execute(text("DELETE FROM ts_search_rank"))

    await mongo_db["snapshots"].delete_many({})

    # ── Seed queries ───────────────────────────────────────
    print(f"Seeding {len(QUERIES)} queries...")
    async with session_factory() as session:
        for q in QUERIES:
            await session.execute(text("""
                INSERT INTO vis_query (query_text, category, priority, brands)
                VALUES (:text, :category, :priority, :brands)
            """), {
                "text": q["text"],
                "category": q["category"],
                "priority": q["priority"],
                "brands": '["Levoit","Dyson","Coway","Honeywell"]',
            })
        await session.commit()

    # ── Seed brands ────────────────────────────────────────
    print("Seeding brands...")
    async with session_factory() as session:
        for brand in BRANDS:
            await session.execute(text("""
                INSERT INTO vis_brand (name, is_primary) VALUES (:name, :is_primary)
            """), {"name": brand, "is_primary": brand == "Levoit"})
        await session.commit()

    # ── Seed pipeline run ──────────────────────────────────
    print("Seeding pipeline run...")
    async with session_factory() as session:
        await session.execute(text("""
            INSERT INTO vis_pipeline_run (flow_name, status, queries_total, success_count, cost_usd, duration_sec, started_at, completed_at)
            VALUES ('seed', 'completed', :total, :total, 0.0, 1.0, :started, :completed)
        """), {
            "total": len(QUERIES),
            "started": now - timedelta(seconds=2),
            "completed": now - timedelta(seconds=1),
        })
        await session.commit()

    # ── Seed 30 days of rankings + scores + snapshots ──────
    print("Seeding 30 days of ranking data...")
    days = 30
    snapshot_count = 0

    for day_offset in range(days, -1, -1):  # oldest first
        ts = now - timedelta(days=day_offset)

        for query_idx in range(len(QUERIES)):
            query_id = query_idx + 1

            for platform in PLATFORMS:
                # Insert MongoDB snapshot
                snapshot_doc = {
                    "query_id": query_id,
                    "platform": platform,
                    "query_text": QUERIES[query_idx]["text"],
                    "raw_html": f"<html><body>Mock AI response for {QUERIES[query_idx]['text']}</body></html>",
                    "markdown": f"# AI Response\nMock response for '{QUERIES[query_idx]['text']}' on {platform}.",
                    "scraped_at": ts,
                    "content_hash": f"hash_{query_id}_{platform}_{day_offset}",
                }
                result = await mongo_db["snapshots"].insert_one(snapshot_doc)
                snapshot_id = str(result.inserted_id)
                snapshot_count += 1

                for brand in BRANDS:
                    rank = _rand_rank(brand, platform, day_offset)
                    snippet = random.choice(SNIPPETS[brand]) if rank > 0 else None
                    score = _score_from_rank(rank)

                    async with session_factory() as session:
                        # Insert ranking
                        await session.execute(text("""
                            INSERT INTO vis_ranking (query_id, platform, brand, rank_position, snippet, snapshot_id, scraped_at)
                            VALUES (:qid, :platform, :brand, :rank, :snippet, :sid, :ts)
                        """), {
                            "qid": query_id,
                            "platform": platform,
                            "brand": brand,
                            "rank": rank,
                            "snippet": snippet,
                            "sid": snapshot_id,
                            "ts": ts,
                        })

                        # Insert raw score
                        await session.execute(text("""
                            INSERT INTO vis_score (query_id, brand, visibility_score, competitive_gap, period, computed_at)
                            VALUES (:qid, :brand, :score, :gap, 'raw', :ts)
                        """), {
                            "qid": query_id,
                            "brand": brand,
                            "score": score,
                            "gap": None,
                            "ts": ts,
                        })
                        await session.commit()

                    # Insert into TimescaleDB ts_search_rank
                    if rank > 0:
                        async with ts_factory() as ts_session:
                            await ts_session.execute(text("""
                                INSERT INTO ts_search_rank (time, query_id, platform, brand, rank_position, visibility_score)
                                VALUES (:time, :qid, :platform, :brand, :rank, :score)
                            """), {
                                "time": ts,
                                "qid": query_id,
                                "platform": platform,
                                "brand": brand,
                                "rank": rank,
                                "score": score,
                            })
                            await ts_session.commit()

    # ── Compute competitive gaps for latest scores ─────────
    print("Computing competitive gaps...")
    async with session_factory() as session:
        for query_idx in range(len(QUERIES)):
            query_id = query_idx + 1
            result = await session.execute(text("""
                SELECT DISTINCT ON (brand) brand, visibility_score
                FROM vis_score
                WHERE query_id = :qid AND period = 'raw'
                ORDER BY brand, computed_at DESC
            """), {"qid": query_id})
            brand_scores = {row.brand: row.visibility_score for row in result}

            levoit_score = brand_scores.get("Levoit", 0)
            competitors = [v for k, v in brand_scores.items() if k != "Levoit"]
            best_competitor = max(competitors) if competitors else 0
            gap = round(levoit_score - best_competitor, 2)

            await session.execute(text("""
                UPDATE vis_score
                SET competitive_gap = :gap
                WHERE id = (
                    SELECT id FROM vis_score
                    WHERE query_id = :qid AND brand = 'Levoit' AND period = 'raw'
                    ORDER BY computed_at DESC LIMIT 1
                )
            """), {"gap": gap, "qid": query_id})
        await session.commit()

    # ── Summary ────────────────────────────────────────────
    async with session_factory() as session:
        q_count = (await session.execute(text("SELECT COUNT(*) FROM vis_query"))).scalar()
        r_count = (await session.execute(text("SELECT COUNT(*) FROM vis_ranking"))).scalar()
        s_count = (await session.execute(text("SELECT COUNT(*) FROM vis_score"))).scalar()
        b_count = (await session.execute(text("SELECT COUNT(*) FROM vis_brand"))).scalar()

    async with ts_factory() as ts_session:
        ts_count = (await ts_session.execute(text("SELECT COUNT(*) FROM ts_search_rank"))).scalar()

    print(f"\nSeed complete:")
    print(f"  vis_query:        {q_count}")
    print(f"  vis_brand:        {b_count}")
    print(f"  vis_ranking:      {r_count}")
    print(f"  vis_score:        {s_count}")
    print(f"  ts_search_rank:   {ts_count}")
    print(f"  mongo snapshots:  {snapshot_count}")

    await pg_engine.dispose()
    await ts_engine.dispose()
    mongo_client.close()


if __name__ == "__main__":
    random.seed(42)  # Reproducible data
    asyncio.run(seed())

"""Async MongoDB client via Motor."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from src.config import settings

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_mongo() -> None:
    global client, db
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client[settings.mongo_db]


async def close_mongo() -> None:
    global client
    if client:
        client.close()


def get_mongo_db() -> AsyncIOMotorDatabase:
    assert db is not None, "MongoDB not connected — call connect_mongo() first"
    return db

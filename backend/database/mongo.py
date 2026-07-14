"""MongoDB connection manager for SkillSwap Flask backend."""

from typing import Optional

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from config import Config

_client: Optional[MongoClient] = None
_db: Optional[Database] = None


def get_client() -> MongoClient:
    """Return a singleton MongoClient instance."""
    global _client

    if _client is None:
        _client = MongoClient(
            Config.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )

    return _client


def get_db() -> Database:
    """Return the active MongoDB database handle."""
    global _db

    if _db is None:
        _db = get_client()[Config.MONGODB_DB_NAME]

    return _db


def init_db() -> Optional[Database]:
    """
    Initialize MongoDB connection and ensure indexes exist.
    Returns None if MongoDB is unavailable (app still starts in degraded mode).
    """
    if not check_connection():
        print("Warning: MongoDB unavailable — running in degraded mode.")
        return None

    db = get_db()
    _ensure_indexes(db)
    return db


def check_connection() -> bool:
    """Ping MongoDB to verify connectivity."""
    try:
        get_client().admin.command("ping")
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError):
        return False


def close_db() -> None:
    """Close the MongoDB client on application shutdown."""
    global _client, _db

    if _client is not None:
        _client.close()
        _client = None
        _db = None


def _ensure_indexes(db: Database) -> None:
    """Create indexes for core collections."""
    db.users.create_index("email", unique=True)
    db.users.create_index("skills_teach")
    db.users.create_index("skills_learn")

    db.matches.create_index([("user_a_id", 1), ("user_b_id", 1)], unique=True)
    db.matches.create_index("match_score")

    db.sessions.create_index([("host_id", 1), ("scheduled_at", 1)])
    db.sessions.create_index([("guest_id", 1), ("scheduled_at", 1)])
    db.sessions.create_index("status")

    db.chats.create_index("participants")
    db.chats.create_index("match_id")

    db.tokens.create_index([("user_id", 1), ("date", 1)], unique=True)

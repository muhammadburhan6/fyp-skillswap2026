"""Unified data store — MongoDB when available, JSON file fallback otherwise."""

import json
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bson import ObjectId

from database.mongo import check_connection, get_db

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "skillswap.json"

DEFAULT_DATA = {
    "users": [],
    "matches": [],
    "sessions": [],
    "chats": [],
    "messages": [],
    "tokens": [],
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _load_json() -> dict:
    if DATA_FILE.exists():
        with open(DATA_FILE, encoding="utf-8") as f:
            return json.load(f)
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    _save_json(DEFAULT_DATA)
    return deepcopy(DEFAULT_DATA)


def _save_json(data: dict) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def using_mongo() -> bool:
    return check_connection()


def _mongo_col(name: str):
    return get_db()[name]


def _find_json(collection: str, query: dict) -> list[dict]:
    data = _load_json()
    items = data.get(collection, [])
    results = []
    for item in items:
        match = True
        for key, value in query.items():
            if item.get(key) != value:
                match = False
                break
        if match:
            results.append(item)
    return results


def _find_one_json(collection: str, query: dict) -> dict | None:
    results = _find_json(collection, query)
    return results[0] if results else None


def find_one(collection: str, query: dict) -> dict | None:
    if using_mongo():
        mongo_query = {}
        for k, v in query.items():
            if k == "_id" or k.endswith("_id"):
                try:
                    mongo_query[k] = ObjectId(v) if isinstance(v, str) else v
                except Exception:
                    mongo_query[k] = v
            else:
                mongo_query[k] = v
        doc = _mongo_col(collection).find_one(mongo_query)
        if doc:
            doc["_id"] = str(doc["_id"])
            for key in list(doc.keys()):
                if key.endswith("_id") and isinstance(doc[key], ObjectId):
                    doc[key] = str(doc[key])
                if key == "participants" and isinstance(doc[key], list):
                    doc[key] = [str(p) if isinstance(p, ObjectId) else p for p in doc[key]]
        return doc
    return _find_one_json(collection, query)


def find_many(collection: str, query: dict | None = None, limit: int = 100) -> list[dict]:
    query = query or {}
    if using_mongo():
        mongo_query = {}
        for k, v in query.items():
            if k == "_id" or k.endswith("_id"):
                try:
                    mongo_query[k] = ObjectId(v) if isinstance(v, str) else v
                except Exception:
                    mongo_query[k] = v
            else:
                mongo_query[k] = v
        docs = list(_mongo_col(collection).find(mongo_query).limit(limit))
        for doc in docs:
            doc["_id"] = str(doc["_id"])
            for key in doc:
                if key.endswith("_id") and isinstance(doc[key], ObjectId):
                    doc[key] = str(doc[key])
                if key == "participants" and isinstance(doc[key], list):
                    doc[key] = [str(p) if isinstance(p, ObjectId) else p for p in doc[key]]
        return docs
    return _find_json(collection, query)[:limit]


def insert_one(collection: str, doc: dict) -> dict:
    doc = deepcopy(doc)
    doc.setdefault("created_at", _now())
    doc.setdefault("updated_at", _now())

    if using_mongo():
        mongo_doc = deepcopy(doc)
        for key in list(mongo_doc.keys()):
            if key.endswith("_id") and key != "_id" and isinstance(mongo_doc[key], str):
                try:
                    mongo_doc[key] = ObjectId(mongo_doc[key])
                except Exception:
                    pass
            if key == "participants" and isinstance(mongo_doc[key], list):
                mongo_doc[key] = [ObjectId(p) if isinstance(p, str) else p for p in mongo_doc[key]]
        result = _mongo_col(collection).insert_one(mongo_doc)
        doc["_id"] = str(result.inserted_id)
        return doc

    doc["_id"] = _new_id()
    data = _load_json()
    data.setdefault(collection, []).append(doc)
    _save_json(data)
    return doc


def update_one(collection: str, query: dict, updates: dict) -> dict | None:
    updates = deepcopy(updates)
    updates["updated_at"] = _now()

    if using_mongo():
        mongo_query = {}
        for k, v in query.items():
            if k == "_id":
                mongo_query[k] = ObjectId(v)
            else:
                mongo_query[k] = v
        _mongo_col(collection).update_one(mongo_query, {"$set": updates})
        return find_one(collection, query)

    data = _load_json()
    for item in data.get(collection, []):
        match = all(item.get(k) == v for k, v in query.items())
        if match:
            item.update(updates)
            _save_json(data)
            return item
    return None


def count(collection: str, query: dict | None = None) -> int:
    query = query or {}
    if using_mongo():
        return _mongo_col(collection).count_documents(query)
    return len(_find_json(collection, query))

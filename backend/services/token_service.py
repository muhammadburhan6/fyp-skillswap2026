from datetime import datetime, timezone

from config import Config
from database import store


def get_or_create_daily_tokens(user_id: str) -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = store.find_one("tokens", {"user_id": user_id, "date": today})

    if existing:
        return existing

    token_doc = store.insert_one(
        "tokens",
        {
            "user_id": user_id,
            "date": today,
            "allocated": Config.DAILY_HEART_TOKENS,
            "spent": 0,
            "remaining": Config.DAILY_HEART_TOKENS,
            "transactions": [],
        },
    )

    store.update_one(
        "users",
        {"_id": user_id},
        {"heart_tokens_balance": Config.DAILY_HEART_TOKENS, "heart_tokens_last_reset": datetime.now(timezone.utc).isoformat()},
    )

    return token_doc


def spend_tokens(user_id: str, amount: int, reason: str, reference_id: str | None = None) -> dict:
    token_doc = get_or_create_daily_tokens(user_id)
    if token_doc["remaining"] < amount:
        raise ValueError("Insufficient heart tokens")

    user = store.find_one("users", {"_id": user_id})
    new_remaining = token_doc["remaining"] - amount
    new_spent = token_doc["spent"] + amount

    transaction = {
        "amount": -amount,
        "reason": reason,
        "reference_id": reference_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    transactions = token_doc.get("transactions", []) + [transaction]

    store.update_one(
        "tokens",
        {"_id": token_doc["_id"]},
        {"remaining": new_remaining, "spent": new_spent, "transactions": transactions},
    )

    store.update_one(
        "users",
        {"_id": user_id},
        {"heart_tokens_balance": max(0, user.get("heart_tokens_balance", 0) - amount)},
    )

    return store.find_one("tokens", {"_id": token_doc["_id"]})

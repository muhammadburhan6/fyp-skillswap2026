"""JWT helpers for signing and verifying auth tokens."""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from config import Config


def generate_token(user_id: int, role: str = "user", expires_days: Optional[int] = None) -> str:
    """Create a signed JWT for an authenticated user."""
    expiry_days = expires_days if expires_days is not None else Config.JWT_EXPIRY_DAYS
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(days=expiry_days),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm=Config.JWT_ALGORITHM)


def generate_purpose_token(user_id: int, purpose: str, expires_minutes: int) -> str:
    """Create a short-lived, single-purpose token (e.g. password reset)."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "purpose": purpose,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm=Config.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT. Returns the claims dict or None if invalid/expired."""
    if not token:
        return None
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

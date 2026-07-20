"""Creates Notification rows so the frontend bell has something to show.

Email notifications are disabled — in-app only. Email send failures on Railway
were noisy and unreliable; the bell remains the source of truth.
"""

from __future__ import annotations

import json
import logging

from database.models import Notification

logger = logging.getLogger(__name__)


def notify(db, user_id: int, type: str, payload: dict | None = None) -> Notification:
    payload = payload or {}
    notif = Notification(
        user_id=user_id,
        type=type,
        payload=json.dumps(payload),
    )
    db.add(notif)
    return notif

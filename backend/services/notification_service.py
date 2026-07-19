"""Creates Notification rows so the frontend bell has something to show.

For all whitelisted events (matches, sessions, paid bookings, reviews,
materials, admin notices — everything except chat DMs) an email is also
dispatched via email_service — real SMTP when configured, data/outbox/
files in development. Email failures never break the request.
"""

from __future__ import annotations

import json
import logging

from database.models import Notification, User
from services.email_service import EMAILABLE_TYPES, send_notification_email

logger = logging.getLogger(__name__)


def notify(db, user_id: int, type: str, payload: dict | None = None) -> Notification:
    payload = payload or {}
    notif = Notification(
        user_id=user_id,
        type=type,
        payload=json.dumps(payload),
    )
    db.add(notif)

    if type in EMAILABLE_TYPES:
        try:
            user = db.get(User, user_id)
            if user and user.email:
                print(
                    f"[email] Notification '{type}' -> emailing user "
                    f"#{user_id} <{user.email}>",
                    flush=True,
                )
                send_notification_email(user.email, user.name or "there", type, payload)
            else:
                print(
                    f"[email] Notification '{type}' for user #{user_id}: "
                    "no email address on record, skipping.",
                    flush=True,
                )
        except Exception:
            logger.exception("Notification email dispatch failed (type=%s, user=%s)", type, user_id)
    else:
        print(f"[email] Notification '{type}' is not emailable, in-app only.", flush=True)

    return notif

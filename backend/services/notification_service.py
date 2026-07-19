"""Creates Notification rows so the frontend bell has something to show.

For all whitelisted events (matches, sessions, paid bookings, reviews,
materials, admin notices — everything except chat DMs) an email is also
dispatched via email_service — real SMTP when configured, data/outbox/
files in development. Email failures never break the request.

Notification emails are sent in the background so a slow/blocked SMTP
server (common on Railway → Gmail) cannot hang the API request.
"""

from __future__ import annotations

import json
import logging

from database.models import Notification, User
from services.email_service import EMAILABLE_TYPES, send_notification_email

logger = logging.getLogger(__name__)


def _send_email_safe(to_email: str, to_name: str, notif_type: str, payload: dict) -> None:
    try:
        send_notification_email(to_email, to_name, notif_type, payload)
    except Exception:
        logger.exception(
            "Background notification email failed (type=%s, to=%s)", notif_type, to_email
        )


def _spawn_email(to_email: str, to_name: str, notif_type: str, payload: dict) -> None:
    try:
        import eventlet

        eventlet.spawn_n(_send_email_safe, to_email, to_name, notif_type, dict(payload))
    except Exception:
        _send_email_safe(to_email, to_name, notif_type, payload)


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
                _spawn_email(user.email, user.name or "there", type, payload)
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

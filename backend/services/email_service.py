"""Email Notification Service.

Sends real SMTP email when configured (SMTP_* in .env). When SMTP is not
configured — the usual case in development — emails are written to
backend/data/outbox/ as .txt files instead, so the email flow stays
demonstrable end-to-end without a mail server.

send_email() returns True only when a real SMTP send succeeded, so callers
like the password-reset flow can keep returning dev links when email is off.

SMTP runs in a native thread (eventlet tpool) so green sockets do not hang
TLS handshakes to Gmail on Railway/gunicorn-eventlet.
"""

import logging
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from pathlib import Path

from config import Config

logger = logging.getLogger(__name__)

OUTBOX_DIR = Path(__file__).resolve().parent.parent / "data" / "outbox"
SMTP_TIMEOUT_SECONDS = 30


def _write_outbox(to_address: str, subject: str, body: str) -> None:
    """Dev fallback: persist the email as a text file in data/outbox/."""
    try:
        OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
        slug = re.sub(r"[^a-z0-9]+", "-", subject.lower()).strip("-")[:40]
        safe_to = re.sub(r"[^a-z0-9@.]+", "_", to_address.lower())
        path = OUTBOX_DIR / f"{int(time.time() * 1000)}_{safe_to}_{slug}.txt"
        path.write_text(
            f"To: {to_address}\nFrom: {Config.SMTP_FROM}\nSubject: {subject}\n\n{body}\n",
            encoding="utf-8",
        )
        logger.info("Email outbox (SMTP off): %s -> %s", subject, path.name)
    except Exception:
        logger.exception("Failed to write outbox email to %s", to_address)


def _smtp_send_message(message: EmailMessage) -> None:
    """Blocking SMTP send using real OS sockets (safe to call via tpool)."""
    host = Config.SMTP_HOST
    port = int(Config.SMTP_PORT or 587)
    user = Config.SMTP_USER
    password = Config.SMTP_PASSWORD
    context = ssl.create_default_context()

    attempts = [(host, port)]
    # Gmail on cloud hosts: if 587 STARTTLS hangs/blocks, try SSL 465.
    if host.lower() == "smtp.gmail.com" and port != 465:
        attempts.append((host, 465))

    last_error: Exception | None = None
    for attempt_host, attempt_port in attempts:
        try:
            if attempt_port == 465:
                with smtplib.SMTP_SSL(
                    attempt_host, attempt_port, timeout=SMTP_TIMEOUT_SECONDS, context=context
                ) as server:
                    server.login(user, password)
                    server.send_message(message)
            else:
                with smtplib.SMTP(attempt_host, attempt_port, timeout=SMTP_TIMEOUT_SECONDS) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(user, password)
                    server.send_message(message)
            return
        except Exception as exc:
            last_error = exc
            print(
                f"[email] SMTP {attempt_host}:{attempt_port} failed: "
                f"{type(exc).__name__}: {exc}",
                flush=True,
            )
    if last_error:
        raise last_error


def _run_smtp(message: EmailMessage) -> None:
    """Run SMTP off the eventlet hub so TLS does not hang."""
    try:
        from eventlet import tpool

        tpool.execute(_smtp_send_message, message)
    except ImportError:
        _smtp_send_message(message)


def send_email(to_address: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send a plain-text (optionally HTML) email. Returns True on SMTP success."""
    if not Config.email_enabled():
        print(
            f"[email] SMTP not configured (host={Config.SMTP_HOST!r}, "
            f"user set={bool(Config.SMTP_USER)}, pass set={bool(Config.SMTP_PASSWORD)}) "
            f"-> writing to outbox for {to_address!r}",
            flush=True,
        )
        _write_outbox(to_address, subject, body)
        return False

    print(
        f"[email] Sending via {Config.SMTP_HOST}:{Config.SMTP_PORT} "
        f"to {to_address!r} — {subject!r}",
        flush=True,
    )

    message = EmailMessage()
    message["From"] = Config.SMTP_FROM
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        _run_smtp(message)
        print(f"[email] OK — delivered to SMTP for {to_address!r}", flush=True)
        return True
    except Exception as exc:
        print(f"[email] FAILED for {to_address!r}: {type(exc).__name__}: {exc}", flush=True)
        logger.exception("Failed to send email to %s", to_address)
        return False


def send_password_reset(to_address: str, reset_link: str) -> bool:
    subject = "Reset your SkillSwap password"
    body = (
        "We received a request to reset your SkillSwap password.\n\n"
        f"Reset it here (valid for 30 minutes): {reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
    html = (
        f"<p>We received a request to reset your SkillSwap password.</p>"
        f'<p><a href="{reset_link}">Reset your password</a> (valid for 30 minutes).</p>'
        f"<p>If you didn't request this, you can safely ignore this email.</p>"
    )
    return send_email(to_address, subject, body, html)


def send_welcome(to_address: str, name: str) -> bool:
    """Account-verification style welcome email sent right after registration."""
    subject = "Welcome to SkillSwap — your account is ready"
    body = (
        f"Hi {name},\n\n"
        "Your SkillSwap account has been created successfully and this address is "
        "now linked to it.\n\n"
        "You start with 200 Skill Points. Add the skills you can teach and the "
        "skills you want to learn, and our AI matching will suggest exchange partners.\n\n"
        f"Log in any time: {Config.FRONTEND_URL}\n\n"
        "Happy swapping!\nThe SkillSwap Team"
    )
    return send_email(to_address, subject, body)


# In-app notification types that also get an email.
# Chat "message" is deliberately excluded — emailing every DM would be spam.
EMAILABLE_TYPES = {
    "match_request": "New skill exchange request on SkillSwap",
    "match_accepted": "Your skill exchange request was accepted",
    "match_declined": "Update on your skill exchange request",
    "session_booked": "A learning session was booked with you",
    "session_completed": "Your SkillSwap session is complete",
    "session_reminder": "Reminder: you have an upcoming SkillSwap session",
    "points_granted": "SkillSwap update: bonus Skill Points added",
    "account_warning": "Important notice about your SkillSwap account",
    "material_published": "New teaching material available on SkillSwap",
    "paid_session_booked": "New paid session booked on SkillSwap",
    "paid_session_confirmed": "Your paid SkillSwap session is confirmed",
    "new_review": "You received a new review on SkillSwap",
}


def _notification_body(notif_type: str, to_name: str, payload: dict) -> str:
    from_name = payload.get("from_name") or payload.get("owner_name") or "Another user"
    skill = payload.get("skill") or "a skill"
    learner = payload.get("learner_name") or "A learner"
    teacher = payload.get("teacher_name") or "your teacher"
    amount = payload.get("amount_usd")
    rating = payload.get("rating")
    points = payload.get("amount", "")
    item_title = payload.get("item_title") or "a new material"
    collection_title = payload.get("collection_title") or "their library"

    lines = {
        "match_request": (
            f"{from_name} sent you a skill exchange request. "
            "Open SkillSwap to accept or decline it."
        ),
        "match_accepted": (
            f"{from_name} accepted your skill exchange request — "
            "a chat has been opened for you two."
        ),
        "match_declined": (
            f"{from_name} declined your skill exchange request this time. "
            "Keep exploring other matches!"
        ),
        "session_booked": (
            "A new learning session has been booked with you. "
            "Check your calendar for the details."
        ),
        "session_completed": (
            "Your session was marked complete. "
            "XP and Skill Points have been applied to your account."
        ),
        "session_reminder": (
            "Friendly reminder: you have an upcoming learning session. "
            "Open your calendar for the time and meeting link."
        ),
        "points_granted": (
            f"An administrator added {points} bonus Skill Points to your wallet."
        ),
        "account_warning": (
            "The moderation team has an important update about your account. "
            "Please sign in to review the notice."
        ),
        "material_published": (
            f'{from_name} published "{item_title}" in "{collection_title}"'
            f"{f' ({skill})' if skill else ''}. "
            "Open Materials to view it."
        ),
        "paid_session_booked": (
            f"{learner} booked a paid session with you for {skill}"
            + (f" (${amount:.2f} earnings)" if isinstance(amount, (int, float)) else "")
            + ". Check your calendar to add a meeting link."
        ),
        "paid_session_confirmed": (
            f"Your payment went through. Your paid session with {teacher} "
            f"for {skill} is confirmed. See your calendar for details."
        ),
        "new_review": (
            f"{from_name} left you a {rating}-star review"
            f"{f' for {skill}' if skill else ''}. "
            "Open your profile to read the feedback."
        ),
    }

    detail = lines.get(notif_type, "You have a new notification on SkillSwap.")
    return (
        f"Hi {to_name},\n\n"
        f"{detail}\n\n"
        f"See details: {Config.FRONTEND_URL}\n\n"
        "— SkillSwap"
    )


def send_notification_email(to_address: str, to_name: str, notif_type: str, payload: dict) -> bool:
    """Email counterpart of an in-app notification, for whitelisted types."""
    subject = EMAILABLE_TYPES.get(notif_type)
    if not subject:
        return False

    body = _notification_body(notif_type, to_name, payload or {})
    return send_email(to_address, subject, body)

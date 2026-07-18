"""Email Notification Service.

Sends real SMTP email when configured (SMTP_* in .env). When SMTP is not
configured — the usual case in development — emails are written to
backend/data/outbox/ as .txt files instead, so the email flow stays
demonstrable end-to-end without a mail server.

send_email() returns True only when a real SMTP send succeeded, so callers
like the password-reset flow can keep returning dev links when email is off.
"""

import logging
import re
import smtplib
import time
from email.message import EmailMessage
from pathlib import Path

from config import Config

logger = logging.getLogger(__name__)

OUTBOX_DIR = Path(__file__).resolve().parent.parent / "data" / "outbox"


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


def send_email(to_address: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send a plain-text (optionally HTML) email. Returns True on SMTP success."""
    if not Config.email_enabled():
        _write_outbox(to_address, subject, body)
        return False

    message = EmailMessage()
    message["From"] = Config.SMTP_FROM
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)
    if html:
        message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception:
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


# In-app notification types that also warrant an email. Chat messages are
# deliberately excluded — emailing every message would be spam.
EMAILABLE_TYPES = {
    "match_request": "New skill exchange request on SkillSwap",
    "match_accepted": "Your skill exchange request was accepted",
    "match_declined": "Update on your skill exchange request",
    "session_booked": "A learning session was booked with you",
    "session_completed": "Your SkillSwap session is complete",
    "points_granted": "SkillSwap update: bonus Skill Points added",
}


def send_notification_email(to_address: str, to_name: str, notif_type: str, payload: dict) -> bool:
    """Email counterpart of an in-app notification, for whitelisted types."""
    subject = EMAILABLE_TYPES.get(notif_type)
    if not subject:
        return False

    from_name = payload.get("from_name", "Another user")
    lines = {
        "match_request": f"{from_name} sent you a skill exchange request. Open SkillSwap to accept or decline it.",
        "match_accepted": f"{from_name} accepted your skill exchange request — a chat has been opened for you two.",
        "match_declined": f"{from_name} declined your skill exchange request this time. Keep exploring other matches!",
        "session_booked": "A new learning session has been booked with you. Check your calendar for the details.",
        "session_completed": "Your session was marked complete. XP and Skill Points have been applied to your account.",
        "points_granted": f"An administrator added {payload.get('amount', '')} bonus Skill Points to your wallet.",
    }
    body = (
        f"Hi {to_name},\n\n"
        f"{lines.get(notif_type, 'You have a new notification.')}\n\n"
        f"See details: {Config.FRONTEND_URL}\n\n"
        "— SkillSwap"
    )
    return send_email(to_address, subject, body)

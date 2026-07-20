"""Email helpers for password-reset and welcome only.

Notification emails are disabled (in-app bell only). Brevo has been removed.
When SMTP_* is not configured, messages are written to data/outbox/ instead.
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
SMTP_TIMEOUT_SECONDS = 20

# Notification emails are off — keep empty so nothing is emailable.
EMAILABLE_TYPES: dict[str, str] = {}


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
        logger.info("Email outbox: %s -> %s", subject, path.name)
    except Exception:
        logger.exception("Failed to write outbox email to %s", to_address)


def _smtp_send_message(message: EmailMessage) -> None:
    host = Config.SMTP_HOST
    port = int(Config.SMTP_PORT or 587)
    user = Config.SMTP_USER
    password = Config.SMTP_PASSWORD
    context = ssl.create_default_context()

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=SMTP_TIMEOUT_SECONDS, context=context) as server:
            server.login(user, password)
            server.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=SMTP_TIMEOUT_SECONDS) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(user, password)
            server.send_message(message)


def _run_smtp(message: EmailMessage) -> None:
    try:
        from eventlet import tpool

        tpool.execute(_smtp_send_message, message)
    except ImportError:
        _smtp_send_message(message)


def send_email(to_address: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send email via SMTP when configured; otherwise write to outbox."""
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
        _run_smtp(message)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_address)
        _write_outbox(to_address, subject, body)
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


def send_notification_email(to_address: str, to_name: str, notif_type: str, payload: dict) -> bool:
    """No-op — notification emails are disabled."""
    return False

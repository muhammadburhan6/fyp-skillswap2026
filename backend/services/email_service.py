"""Minimal SMTP email helper.

Sending is a no-op (returns False) when SMTP is not configured, so callers can
fall back gracefully (e.g. returning a reset link directly in dev mode).
"""

import logging
import smtplib
from email.message import EmailMessage

from config import Config

logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send a plain-text (optionally HTML) email. Returns True on success."""
    if not Config.email_enabled():
        logger.warning("SMTP not configured; skipping email to %s (subject=%r)", to_address, subject)
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

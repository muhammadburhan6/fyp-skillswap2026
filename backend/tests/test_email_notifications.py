"""Tests for the Email Notification Service (dev outbox fallback mode).

SMTP is not configured in tests, so every send lands in data/outbox/ as a
.txt file. Tests use uuid-unique recipient addresses and clean their own
files up afterwards.
"""

import uuid

from services import email_service
from services.email_service import EMAILABLE_TYPES, send_email
from tests.conftest import auth_header


def _email(prefix="mail"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _outbox_files_for(address):
    if not email_service.OUTBOX_DIR.exists():
        return []
    needle = address.lower().replace("@", "@")
    return [p for p in email_service.OUTBOX_DIR.glob("*.txt") if address.lower() in p.name]


def _cleanup(address):
    for p in _outbox_files_for(address):
        p.unlink(missing_ok=True)


def test_send_email_falls_back_to_outbox_file():
    addr = _email("direct")
    try:
        ok = send_email(addr, "Test subject line", "Test body content")
        assert ok is False  # no real SMTP send happened
        files = _outbox_files_for(addr)
        assert len(files) == 1
        content = files[0].read_text(encoding="utf-8")
        assert "Test subject line" in content
        assert "Test body content" in content
        assert f"To: {addr}" in content
    finally:
        _cleanup(addr)


def test_register_sends_welcome_email(client):
    addr = _email("welcome")
    try:
        resp = client.post("/api/auth/register", json={
            "email": addr, "password": "secret123", "name": "Mail Tester",
        })
        assert resp.status_code == 201
        files = _outbox_files_for(addr)
        assert len(files) == 1
        content = files[0].read_text(encoding="utf-8")
        assert "Welcome to SkillSwap" in content
        assert "Mail Tester" in content
    finally:
        _cleanup(addr)


def test_match_request_is_in_app_only_no_email(client, make_user):
    requester = make_user(_email("req"))
    target_addr = _email("target")
    target = make_user(target_addr)
    _cleanup(target_addr)

    try:
        resp = client.post(
            "/api/matches/request",
            json={"target_user_id": target["id"]},
            headers=auth_header(requester["token"]),
        )
        assert resp.status_code in (200, 201)
        notifs = client.get("/api/notifications/", headers=auth_header(target["token"])).get_json()["notifications"]
        assert any(n["type"] == "match_request" for n in notifs)
        assert _outbox_files_for(target_addr) == []
    finally:
        _cleanup(target_addr)


def test_admin_distribute_creates_notification_without_email(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    user_addr = _email("bonus")
    user = make_user(user_addr)
    _cleanup(user_addr)

    try:
        resp = client.post(
            "/api/admin/tokens/distribute",
            json={"amount": 50},
            headers=auth_header(admin["token"]),
        )
        assert resp.status_code == 200

        notifs = client.get("/api/notifications/", headers=auth_header(user["token"])).get_json()["notifications"]
        assert any(n["type"] == "points_granted" for n in notifs)
        assert _outbox_files_for(user_addr) == []
    finally:
        _cleanup(user_addr)


def test_notification_emails_disabled():
    assert EMAILABLE_TYPES == {}
    assert "message" not in EMAILABLE_TYPES
    assert "match_request" not in EMAILABLE_TYPES

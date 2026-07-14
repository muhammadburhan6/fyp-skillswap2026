"""Tests for wallet ownership enforcement."""

import uuid

from tests.conftest import auth_header


def _email():
    return f"wallet_{uuid.uuid4().hex[:10]}@example.com"


def test_user_can_read_own_wallet(client, make_user):
    user = make_user(_email())
    resp = client.get(f"/api/wallet/{user['id']}", headers=auth_header(user["token"]))
    assert resp.status_code == 200
    assert "balance" in resp.get_json()


def test_user_cannot_read_other_wallet(client, make_user):
    a = make_user(_email())
    b = make_user(_email())
    resp = client.get(f"/api/wallet/{b['id']}", headers=auth_header(a["token"]))
    assert resp.status_code == 403


def test_admin_can_read_any_wallet(client, make_user):
    admin = make_user(_email(), role="admin")
    victim = make_user(_email())
    resp = client.get(f"/api/wallet/{victim['id']}", headers=auth_header(admin["token"]))
    assert resp.status_code == 200

"""Tests for require_auth / require_admin middleware behavior."""

import uuid

from utils.jwt_utils import generate_token
from tests.conftest import auth_header


def _email():
    return f"mw_{uuid.uuid4().hex[:10]}@example.com"


def test_valid_token_allows_access(client, make_user):
    user = make_user(_email())
    resp = client.get("/api/users/me", headers=auth_header(user["token"]))
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == user["email"]


def test_missing_token_rejected(client):
    resp = client.get("/api/users/me")
    assert resp.status_code == 401


def test_garbage_token_rejected(client):
    resp = client.get("/api/users/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_expired_token_rejected(client, make_user):
    user = make_user(_email())
    expired = generate_token(user["id"], "user", expires_days=-1)
    resp = client.get("/api/users/me", headers=auth_header(expired))
    assert resp.status_code == 401


def test_admin_route_forbids_normal_user(client, make_user):
    user = make_user(_email(), role="user")
    resp = client.get("/api/admin/stats", headers=auth_header(user["token"]))
    assert resp.status_code == 403


def test_admin_route_allows_admin(client, make_user):
    admin = make_user(_email(), role="admin")
    resp = client.get("/api/admin/stats", headers=auth_header(admin["token"]))
    assert resp.status_code == 200

"""Tests for the auth routes."""

import uuid


def _unique_email():
    return f"user_{uuid.uuid4().hex[:10]}@example.com"


def test_register_happy_path(client):
    email = _unique_email()
    resp = client.post("/api/auth/register", json={"email": email, "password": "secret123", "name": "Alice"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["user"]["email"] == email
    # Token should be a JWT (three dot-separated segments), not a raw user id.
    assert data["token"].count(".") == 2


def test_register_duplicate_email(client):
    email = _unique_email()
    first = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert first.status_code == 201
    dup = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert dup.status_code == 409


def test_register_short_password(client):
    resp = client.post("/api/auth/register", json={"email": _unique_email(), "password": "123"})
    assert resp.status_code == 400


def test_login_happy_path(client):
    email = _unique_email()
    client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "secret123"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["token"].count(".") == 2


def test_login_wrong_password(client):
    email = _unique_email()
    client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    resp = client.post("/api/auth/login", json={"email": email, "password": "wrongpass"})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/api/auth/login", json={"email": _unique_email(), "password": "secret123"})
    assert resp.status_code == 401

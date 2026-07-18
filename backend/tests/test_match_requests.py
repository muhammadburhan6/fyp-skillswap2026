"""Tests for the exchange-request flow (request → accept/decline) and admin user deletion."""

import uuid

from database.models import Match, SessionLocal
from tests.conftest import auth_header


def _email(prefix="req"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _reset_matches(*user_ids):
    """make_user's teardown deletes User rows but not Match rows, and SQLite
    reuses freed ids — clear stray matches so fresh users start clean."""
    db = SessionLocal()
    try:
        db.query(Match).filter(
            (Match.user_a_id.in_(user_ids)) | (Match.user_b_id.in_(user_ids))
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_request_appears_in_target_incoming_list(client, make_user):
    requester = make_user(_email("a"))
    target = make_user(_email("b"))
    _reset_matches(requester["id"], target["id"])

    resp = client.post(
        "/api/matches/request",
        json={"target_user_id": target["id"]},
        headers=auth_header(requester["token"]),
    )
    assert resp.status_code == 201

    incoming = client.get("/api/matches/requests", headers=auth_header(target["token"]))
    assert incoming.status_code == 200
    reqs = incoming.get_json()["requests"]
    assert any(r["user"]["id"] == requester["id"] for r in reqs)


def test_duplicate_request_not_created(client, make_user):
    requester = make_user(_email("a"))
    target = make_user(_email("b"))
    _reset_matches(requester["id"], target["id"])

    first = client.post(
        "/api/matches/request",
        json={"target_user_id": target["id"]},
        headers=auth_header(requester["token"]),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/matches/request",
        json={"target_user_id": target["id"]},
        headers=auth_header(requester["token"]),
    )
    assert second.status_code == 200  # existing pending match returned, not duplicated

    db = SessionLocal()
    try:
        count = db.query(Match).filter(
            Match.user_a_id == requester["id"], Match.user_b_id == target["id"]
        ).count()
        assert count == 1
    finally:
        db.close()


def test_decline_marks_match_declined_and_notifies(client, make_user):
    requester = make_user(_email("a"))
    target = make_user(_email("b"))
    _reset_matches(requester["id"], target["id"])

    client.post(
        "/api/matches/request",
        json={"target_user_id": target["id"]},
        headers=auth_header(requester["token"]),
    )

    resp = client.post(
        "/api/matches/decline",
        json={"target_user_id": requester["id"]},
        headers=auth_header(target["token"]),
    )
    assert resp.status_code == 200
    assert resp.get_json()["match"]["status"] == "declined"

    # declined request no longer shows as incoming
    incoming = client.get("/api/matches/requests", headers=auth_header(target["token"]))
    assert not any(r["user"]["id"] == requester["id"] for r in incoming.get_json()["requests"])

    # requester got notified
    notifs = client.get("/api/notifications/", headers=auth_header(requester["token"]))
    assert any(n["type"] == "match_declined" for n in notifs.get_json()["notifications"])


def test_decline_without_pending_request_404s(client, make_user):
    a = make_user(_email("a"))
    b = make_user(_email("b"))
    resp = client.post(
        "/api/matches/decline",
        json={"target_user_id": a["id"]},
        headers=auth_header(b["token"]),
    )
    assert resp.status_code == 404


def test_admin_can_delete_user(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    victim = make_user(_email("victim"))

    resp = client.delete(
        f"/api/admin/users/{victim['id']}",
        json={"confirm": "DELETE"},
        headers=auth_header(admin["token"]),
    )
    assert resp.status_code == 200

    users = client.get("/api/admin/users", headers=auth_header(admin["token"])).get_json()["users"]
    assert not any(u["id"] == victim["id"] for u in users)


def test_admin_delete_requires_confirm(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    victim = make_user(_email("victim"))
    resp = client.delete(f"/api/admin/users/{victim['id']}", headers=auth_header(admin["token"]))
    assert resp.status_code == 400


def test_admin_cannot_delete_admin_or_self(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    other_admin = make_user(_email("admin2"), role="admin")

    self_resp = client.delete(
        f"/api/admin/users/{admin['id']}",
        json={"confirm": "DELETE"},
        headers=auth_header(admin["token"]),
    )
    assert self_resp.status_code == 400

    other_resp = client.delete(
        f"/api/admin/users/{other_admin['id']}",
        json={"confirm": "DELETE"},
        headers=auth_header(admin["token"]),
    )
    assert other_resp.status_code == 403


def test_normal_user_cannot_delete_users(client, make_user):
    user = make_user(_email("user"))
    victim = make_user(_email("victim"))
    resp = client.delete(
        f"/api/admin/users/{victim['id']}",
        json={"confirm": "DELETE"},
        headers=auth_header(user["token"]),
    )
    assert resp.status_code == 403

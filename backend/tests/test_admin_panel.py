"""Tests for the admin panel: stats, user status, disputes, moderation, analytics."""

import uuid

from database.models import Dispute, SessionLocal, Skill, SkillModeration, User
from tests.conftest import auth_header


def _email(prefix="adm"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def test_stats_include_moderation_counts(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    resp = client.get("/api/admin/stats", headers=auth_header(admin["token"]))
    body = resp.get_json()
    for key in ("total_users", "active_users", "open_disputes", "pending_skills", "completed_sessions"):
        assert key in body


def test_users_search_filters_by_name(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    make_user(_email("findme"), name="Zebra Uniquename")

    resp = client.get("/api/admin/users?q=zebra", headers=auth_header(admin["token"]))
    users = resp.get_json()["users"]
    assert any(u["name"] == "Zebra Uniquename" for u in users)
    assert all("zebra" in u["name"].lower() or "zebra" in u["email"].lower() for u in users)


def test_suspended_user_cannot_login(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    victim = make_user(_email("victim"))

    patch = client.patch(
        f"/api/admin/users/{victim['id']}/status",
        json={"status": "suspended"},
        headers=auth_header(admin["token"]),
    )
    assert patch.status_code == 200
    assert patch.get_json()["user"]["status"] == "suspended"

    login = client.post("/api/auth/login", json={"email": victim["email"], "password": victim["password"]})
    assert login.status_code == 403
    assert "suspended" in login.get_json()["error"].lower()

    # reactivate works
    client.patch(
        f"/api/admin/users/{victim['id']}/status",
        json={"status": "active"},
        headers=auth_header(admin["token"]),
    )
    login2 = client.post("/api/auth/login", json={"email": victim["email"], "password": victim["password"]})
    assert login2.status_code == 200


def test_dispute_ban_flow_bans_accused(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    reporter = make_user(_email("rep"))
    accused = make_user(_email("acc"))

    db = SessionLocal()
    try:
        dispute = Dispute(
            reporter_id=reporter["id"], accused_id=accused["id"],
            skill_name="TestSkill", complaint="Did not show up", status="open",
        )
        db.add(dispute)
        db.commit()
        dispute_id = dispute.id
    finally:
        db.close()

    listing = client.get("/api/admin/disputes", headers=auth_header(admin["token"]))
    assert any(d["id"] == dispute_id for d in listing.get_json()["disputes"])

    resp = client.patch(
        f"/api/admin/disputes/{dispute_id}",
        json={"action": "ban"},
        headers=auth_header(admin["token"]),
    )
    assert resp.status_code == 200
    assert resp.get_json()["dispute"]["status"] == "banned"

    # accused can no longer log in
    login = client.post("/api/auth/login", json={"email": accused["email"], "password": accused["password"]})
    assert login.status_code == 403


def test_moderation_approve_adds_skill_to_catalog(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    submitter = make_user(_email("sub"))
    unique_skill = f"Modskill{uuid.uuid4().hex[:6]}"

    db = SessionLocal()
    try:
        item = SkillModeration(user_id=submitter["id"], skill_name=unique_skill, category="Test", status="pending")
        db.add(item)
        db.commit()
        item_id = item.id
    finally:
        db.close()

    resp = client.patch(
        f"/api/admin/moderation/{item_id}",
        json={"action": "approve"},
        headers=auth_header(admin["token"]),
    )
    assert resp.status_code == 200
    assert resp.get_json()["item"]["status"] == "approved"

    db = SessionLocal()
    try:
        assert db.query(Skill).filter(Skill.name == unique_skill).first() is not None
    finally:
        db.close()


def test_moderation_reject_requires_reason(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    submitter = make_user(_email("sub"))

    db = SessionLocal()
    try:
        item = SkillModeration(user_id=submitter["id"], skill_name=f"Rej{uuid.uuid4().hex[:6]}", status="pending")
        db.add(item)
        db.commit()
        item_id = item.id
    finally:
        db.close()

    missing = client.patch(
        f"/api/admin/moderation/{item_id}",
        json={"action": "reject"},
        headers=auth_header(admin["token"]),
    )
    assert missing.status_code == 400

    ok = client.patch(
        f"/api/admin/moderation/{item_id}",
        json={"action": "reject", "reason": "Not a real skill"},
        headers=auth_header(admin["token"]),
    )
    assert ok.status_code == 200
    assert ok.get_json()["item"]["status"] == "rejected"


def test_analytics_shape(client, make_user):
    admin = make_user(_email("admin"), role="admin")
    resp = client.get("/api/admin/analytics", headers=auth_header(admin["token"]))
    body = resp.get_json()
    assert isinstance(body["demand"], list)
    assert {x["label"] for x in body["users_pie"]} == {"Active", "Suspended", "Banned"}
    assert len(body["timeline"]) == 6
    for point in body["timeline"]:
        assert {"month", "swaps", "disputes"} <= set(point)


def test_admin_routes_forbidden_for_normal_users(client, make_user):
    user = make_user(_email("user"))
    for method, path in [
        ("get", "/api/admin/disputes"),
        ("get", "/api/admin/moderation"),
        ("get", "/api/admin/analytics"),
    ]:
        resp = getattr(client, method)(path, headers=auth_header(user["token"]))
        assert resp.status_code == 403

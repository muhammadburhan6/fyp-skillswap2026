"""Tests for the Skill Demand Analysis service and endpoint."""

import uuid
from datetime import datetime, timezone

from database.models import Session as SwapSession, SessionLocal, Skill, User
from services.skill_demand_service import analyze_skill_demand, _demand_level
from tests.conftest import auth_header


def _email(prefix="demand"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _unique_skill(db, prefix="Skill"):
    s = Skill(name=f"{prefix}-{uuid.uuid4().hex[:8]}", category="Test")
    db.add(s)
    db.flush()
    return s


def test_demand_level_labels():
    assert _demand_level(learners=3, teachers=0) == "high"
    assert _demand_level(learners=4, teachers=2) == "high"
    assert _demand_level(learners=3, teachers=2) == "rising"
    assert _demand_level(learners=1, teachers=2) == "steady"


def test_most_wanted_skill_ranks_first(make_user):
    hot_learners = [make_user(_email()) for _ in range(3)]
    cold_learner = make_user(_email())

    db = SessionLocal()
    try:
        hot = _unique_skill(db, "Hot")
        cold = _unique_skill(db, "Cold")

        users = [db.get(User, ref["id"]) for ref in hot_learners]
        for u in users:
            u.skills_learn.append(hot)
        cold_user = db.get(User, cold_learner["id"])
        cold_user.skills_learn.append(cold)
        db.commit()

        result = analyze_skill_demand(db, limit=50)
        names = [s["name"] for s in result["skills"]]
        assert hot.name in names and cold.name in names
        assert names.index(hot.name) < names.index(cold.name)

        hot_entry = next(s for s in result["skills"] if s["name"] == hot.name)
        assert hot_entry["learners"] == 3
        assert hot_entry["teachers"] == 0
        assert hot_entry["level"] == "high"
    finally:
        db.close()


def test_sessions_count_toward_demand(make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))

    db = SessionLocal()
    try:
        skill = _unique_skill(db, "Booked")
        learner_user = db.get(User, learner["id"])
        learner_user.skills_learn.append(skill)
        db.add(SwapSession(
            teacher_id=teacher["id"],
            learner_id=learner["id"],
            skill_id=skill.id,
            scheduled_at=datetime.now(timezone.utc),
            status="completed",
        ))
        db.commit()

        result = analyze_skill_demand(db, limit=50)
        entry = next(s for s in result["skills"] if s["name"] == skill.name)
        assert entry["sessions"] == 1
        # 1 learner * 2 + 1 session * 1
        assert entry["demand_score"] == 3
    finally:
        db.close()


def test_skill_demand_endpoint(client, make_user):
    user = make_user(_email())
    resp = client.get("/api/ai/skill-demand", headers=auth_header(user["token"]))
    assert resp.status_code == 200
    body = resp.get_json()
    assert "skills" in body
    assert "insight" in body
    assert body["mode"] in ("ai", "fallback")


def test_skill_demand_requires_auth(client):
    resp = client.get("/api/ai/skill-demand")
    assert resp.status_code == 401

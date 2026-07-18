"""Tests for the data-backed SkillBot assistant (no OpenAI key in tests)."""

import uuid
from datetime import datetime, timedelta, timezone

from database.models import Match, Session as SwapSession, SessionLocal, Skill, User
from services.skillbot_service import smart_reply
from tests.conftest import auth_header


def _email(prefix="bot"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _get_user(db, ref):
    return db.get(User, ref["id"])


def test_points_reply_contains_real_balance(make_user):
    ref = make_user(_email())
    db = SessionLocal()
    try:
        user = _get_user(db, ref)
        reply = smart_reply(db, user, "how many points do I have?")
        assert str(user.points_balance) in reply
        assert "Skill Points" in reply
    finally:
        db.close()


def test_level_reply_shows_xp_progress(make_user):
    ref = make_user(_email())
    db = SessionLocal()
    try:
        user = _get_user(db, ref)
        user.xp = 130
        user.level = 2
        db.commit()
        reply = smart_reply(db, user, "what level am I?")
        assert "Level 2" in reply
        assert "130" in reply
        assert "70" in reply  # XP remaining to level 3
    finally:
        db.close()


def test_matches_reply_names_reciprocal_partner(make_user):
    a_ref = make_user(_email("a"))
    b_ref = make_user(_email("b"), name="Bot Partner")
    db = SessionLocal()
    try:
        a = _get_user(db, a_ref)
        b = _get_user(db, b_ref)
        piano = Skill(name=f"Piano-{uuid.uuid4().hex[:6]}", category="Music")
        chess = Skill(name=f"Chess-{uuid.uuid4().hex[:6]}", category="Games")
        db.add_all([piano, chess])
        db.flush()
        a.skills_learn.append(piano)
        a.skills_teach.append(chess)
        b.skills_teach.append(piano)
        b.skills_learn.append(chess)
        db.commit()

        reply = smart_reply(db, a, "find me a match")
        assert "Bot Partner" in reply
        assert "perfect swap" in reply
    finally:
        db.close()


def test_trending_reply_lists_a_skill(make_user):
    learners = [make_user(_email()) for _ in range(2)]
    db = SessionLocal()
    try:
        hot = Skill(name=f"Hot-{uuid.uuid4().hex[:6]}", category="Test")
        db.add(hot)
        db.flush()
        users = [_get_user(db, r) for r in learners]
        for u in users:
            u.skills_learn.append(hot)
        db.commit()

        reply = smart_reply(db, users[0], "what skills are trending?")
        assert "in-demand" in reply
        assert "learner" in reply
    finally:
        db.close()


def test_requests_reply_counts_pending(make_user):
    a_ref = make_user(_email("a"))
    b_ref = make_user(_email("b"))
    db = SessionLocal()
    try:
        db.query(Match).filter(
            (Match.user_b_id == b_ref["id"]) | (Match.user_a_id == b_ref["id"])
        ).delete(synchronize_session=False)
        db.add(Match(user_a_id=a_ref["id"], user_b_id=b_ref["id"], match_score=50, status="pending"))
        db.commit()
        b = _get_user(db, b_ref)
        reply = smart_reply(db, b, "any requests for me?")
        assert "1 pending" in reply
    finally:
        db.close()


def test_sessions_reply_shows_upcoming(make_user):
    t_ref = make_user(_email("t"))
    l_ref = make_user(_email("l"), name="Learner Person")
    db = SessionLocal()
    try:
        when = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2)
        db.add(SwapSession(
            teacher_id=t_ref["id"], learner_id=l_ref["id"],
            scheduled_at=when, status="scheduled",
        ))
        db.commit()
        t = _get_user(db, t_ref)
        reply = smart_reply(db, t, "when is my next session?")
        assert "Learner Person" in reply
        assert "teaching" in reply
    finally:
        db.close()


def test_greeting_and_default(make_user):
    ref = make_user(_email(), name="Greet Tester")
    db = SessionLocal()
    try:
        user = _get_user(db, ref)
        assert "Greet" in smart_reply(db, user, "hi")
        default = smart_reply(db, user, "zzzqqq unrelated")
        assert "trending" in default  # helpful nudge
    finally:
        db.close()


def test_chat_endpoint_returns_smart_mode(client, make_user):
    ref = make_user(_email())
    resp = client.post(
        "/api/ai/chat",
        json={"message": "how many points do I have?"},
        headers=auth_header(ref["token"]),
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["mode"] == "smart"
    assert "Skill Points" in body["reply"]

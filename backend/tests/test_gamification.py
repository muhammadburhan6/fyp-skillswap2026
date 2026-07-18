"""Tests for XP/level progression and badge awarding."""

import uuid
from datetime import datetime, timezone

from database.models import Review, Session as SwapSession, SessionLocal, User
from services.gamification_service import award_xp, check_and_award_badges


def _email(prefix="gami"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _completed_session(db, teacher_id, learner_id):
    s = SwapSession(
        teacher_id=teacher_id,
        learner_id=learner_id,
        scheduled_at=datetime.now(timezone.utc),
        status="completed",
    )
    db.add(s)
    db.flush()
    return s


def _reset_activity(db, *user_ids):
    """The make_user fixture deletes its User rows but not Sessions/Reviews that
    reference them, and SQLite reuses freed ids — so a fresh user in a later
    test can inherit an earlier test's orphaned rows. Clear the slate first."""
    for uid in user_ids:
        db.query(SwapSession).filter(
            (SwapSession.teacher_id == uid) | (SwapSession.learner_id == uid)
        ).delete(synchronize_session=False)
        db.query(Review).filter(
            (Review.reviewer_id == uid) | (Review.reviewee_id == uid)
        ).delete(synchronize_session=False)
    db.commit()


def test_award_xp_levels_up(make_user):
    user_ref = make_user(_email(), xp=0, level=1)
    db = SessionLocal()
    try:
        user = db.get(User, user_ref["id"])
        result = award_xp(db, user, 150)
        db.commit()
        assert result["leveled_up"] is True
        assert user.xp == 150
        assert user.level == 2
    finally:
        db.close()


def test_award_xp_no_level_up_below_threshold(make_user):
    user_ref = make_user(_email(), xp=0, level=1)
    db = SessionLocal()
    try:
        user = db.get(User, user_ref["id"])
        result = award_xp(db, user, 50)
        db.commit()
        assert result["leveled_up"] is False
        assert user.level == 1
    finally:
        db.close()


def test_first_swap_badge_awarded_once(make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    db = SessionLocal()
    try:
        _reset_activity(db, teacher["id"], learner["id"])
        _completed_session(db, teacher["id"], learner["id"])
        db.commit()

        first_pass = check_and_award_badges(db, teacher["id"])
        db.commit()
        assert "First Swap" in first_pass

        second_pass = check_and_award_badges(db, teacher["id"])
        db.commit()
        assert second_pass == []
    finally:
        db.close()


def test_ten_sessions_streak_badge_requires_ten_completed(make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    db = SessionLocal()
    try:
        _reset_activity(db, teacher["id"], learner["id"])
        for _ in range(9):
            _completed_session(db, teacher["id"], learner["id"])
        db.commit()
        assert "10 Sessions Streak" not in check_and_award_badges(db, teacher["id"])
        db.commit()

        _completed_session(db, teacher["id"], learner["id"])
        db.commit()
        assert "10 Sessions Streak" in check_and_award_badges(db, teacher["id"])
    finally:
        db.close()


def test_five_star_teacher_badge_requires_five_five_star_reviews(make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    db = SessionLocal()
    try:
        _reset_activity(db, teacher["id"], learner["id"])
        for i in range(4):
            s = _completed_session(db, teacher["id"], learner["id"])
            db.add(Review(session_id=s.id, reviewer_id=learner["id"], reviewee_id=teacher["id"], rating=5))
        db.commit()
        assert "5-Star Teacher" not in check_and_award_badges(db, teacher["id"])
        db.commit()

        s = _completed_session(db, teacher["id"], learner["id"])
        db.add(Review(session_id=s.id, reviewer_id=learner["id"], reviewee_id=teacher["id"], rating=5))
        db.commit()
        assert "5-Star Teacher" in check_and_award_badges(db, teacher["id"])
    finally:
        db.close()

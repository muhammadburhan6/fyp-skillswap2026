"""Tests for the /api/reviews endpoint."""

import uuid
from datetime import datetime, timezone

from database.models import Session as SwapSession, SessionLocal
from tests.conftest import auth_header


def _email(prefix="review"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _make_session(teacher_id, learner_id, status="completed"):
    db = SessionLocal()
    try:
        s = SwapSession(
            teacher_id=teacher_id,
            learner_id=learner_id,
            scheduled_at=datetime.now(timezone.utc),
            status=status,
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        return s.id
    finally:
        db.close()


def test_learner_can_review_completed_session(client, make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    session_id = _make_session(teacher["id"], learner["id"])

    resp = client.post(
        "/api/reviews/",
        json={"session_id": session_id, "rating": 5, "comment": "Great teacher!"},
        headers=auth_header(learner["token"]),
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["review"]["rating"] == 5


def test_teacher_cannot_review_own_session(client, make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    session_id = _make_session(teacher["id"], learner["id"])

    resp = client.post(
        "/api/reviews/",
        json={"session_id": session_id, "rating": 5},
        headers=auth_header(teacher["token"]),
    )
    assert resp.status_code == 403


def test_cannot_review_session_that_is_not_completed(client, make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    session_id = _make_session(teacher["id"], learner["id"], status="scheduled")

    resp = client.post(
        "/api/reviews/",
        json={"session_id": session_id, "rating": 4},
        headers=auth_header(learner["token"]),
    )
    assert resp.status_code == 400


def test_cannot_review_same_session_twice(client, make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    session_id = _make_session(teacher["id"], learner["id"])

    first = client.post(
        "/api/reviews/",
        json={"session_id": session_id, "rating": 5},
        headers=auth_header(learner["token"]),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/reviews/",
        json={"session_id": session_id, "rating": 3},
        headers=auth_header(learner["token"]),
    )
    assert second.status_code == 409


def test_invalid_rating_rejected(client, make_user):
    teacher = make_user(_email("teacher"))
    learner = make_user(_email("learner"))
    session_id = _make_session(teacher["id"], learner["id"])

    resp = client.post(
        "/api/reviews/",
        json={"session_id": session_id, "rating": 9},
        headers=auth_header(learner["token"]),
    )
    assert resp.status_code == 400

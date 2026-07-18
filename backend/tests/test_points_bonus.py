"""Tests for welcome signup bonus ledger and 24h daily login bonus."""

import uuid
from datetime import datetime, timedelta, timezone

from database.models import PointsTransaction, SessionLocal, User
from services.points_service import (
    DAILY_BONUS,
    DAILY_REASON,
    SIGNUP_BONUS,
    SIGNUP_REASON,
    claim_daily_bonus,
    record_signup_bonus,
)
from tests.conftest import auth_header


def _email(prefix="sp"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def test_register_records_signup_bonus_transaction(client):
    email = _email("reg")
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "secret123",
        "name": "Newbie",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    user_id = data["user"]["id"]
    assert data["user"]["points_balance"] == SIGNUP_BONUS
    assert data["user"]["has_seen_welcome_popup"] is False

    db = SessionLocal()
    try:
        reasons = [
            t.reason
            for t in db.query(PointsTransaction).filter_by(user_id=user_id).all()
        ]
        assert SIGNUP_REASON in reasons
        signup_txns = [
            t for t in db.query(PointsTransaction).filter_by(user_id=user_id, reason=SIGNUP_REASON).all()
        ]
        assert len(signup_txns) == 1
        assert signup_txns[0].amount == SIGNUP_BONUS
    finally:
        db.close()


def test_daily_bonus_is_100_and_once_per_24h(client, make_user):
    user = make_user(_email("daily"))
    headers = auth_header(user["token"])

    first = client.post("/api/wallet/daily-bonus", headers=headers)
    assert first.status_code == 200
    body = first.get_json()
    assert body["claimed"] is True
    assert body["amount"] == DAILY_BONUS == 100
    assert body["already_claimed"] is False

    second = client.post("/api/wallet/daily-bonus", headers=headers)
    assert second.status_code == 200
    body2 = second.get_json()
    assert body2["claimed"] is False
    assert body2["already_claimed"] is True
    assert body2["amount"] == 0
    assert body2["balance"] == body["balance"]


def test_daily_bonus_available_after_24_hours(make_user):
    info = make_user(_email("svc"))
    db = SessionLocal()
    try:
        u = db.get(User, info["id"])
        start = u.points_balance
        t0 = datetime(2026, 7, 16, 10, 0, 0, tzinfo=timezone.utc)

        r1 = claim_daily_bonus(db, u, at=t0)
        db.commit()
        assert r1["claimed"] is True
        assert u.points_balance == start + DAILY_BONUS

        # 12 hours later — still blocked
        r2 = claim_daily_bonus(db, u, at=t0 + timedelta(hours=12))
        db.commit()
        assert r2["already_claimed"] is True
        assert u.points_balance == start + DAILY_BONUS

        # 24 hours later — allowed
        r3 = claim_daily_bonus(db, u, at=t0 + timedelta(hours=24))
        db.commit()
        assert r3["claimed"] is True
        assert u.points_balance == start + 2 * DAILY_BONUS
        assert u.streak == 2
    finally:
        db.close()


def test_welcome_seen_flag(client, make_user):
    user = make_user(_email("welcome"), has_seen_welcome_popup=False)
    headers = auth_header(user["token"])

    before = client.get(f"/api/wallet/{user['id']}", headers=headers).get_json()
    assert before["has_seen_welcome_popup"] is False

    resp = client.post("/api/wallet/welcome-seen", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["has_seen_welcome_popup"] is True

    after = client.get(f"/api/wallet/{user['id']}", headers=headers).get_json()
    assert after["has_seen_welcome_popup"] is True
    assert after["daily_bonus_amount"] == 100


def test_calendar_marks_daily_bonus_day(client, make_user):
    user = make_user(_email("cal"))
    headers = auth_header(user["token"])
    claim = client.post("/api/wallet/daily-bonus", headers=headers)
    assert claim.status_code == 200

    today = datetime.now(timezone.utc).date()
    cal = client.get(
        f"/api/wallet/calendar?year={today.year}&month={today.month}",
        headers=headers,
    )
    assert cal.status_code == 200
    data = cal.get_json()
    day_entry = next(d for d in data["days"] if d["day"] == today.day)
    assert day_entry["has_daily_bonus"] is True
    assert day_entry["has_activity"] is True
    assert day_entry["earned"] >= DAILY_BONUS


def test_record_signup_bonus_does_not_double_balance(make_user):
    info = make_user(_email("ledger"))
    db = SessionLocal()
    try:
        u = db.get(User, info["id"])
        before = u.points_balance
        record_signup_bonus(db, u)
        db.commit()
        db.refresh(u)
        assert u.points_balance == before
        txn = db.query(PointsTransaction).filter_by(user_id=u.id, reason=SIGNUP_REASON).one()
        assert txn.amount == SIGNUP_BONUS
    finally:
        db.close()

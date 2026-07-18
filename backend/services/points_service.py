"""Skill Points helpers — signup ledger, daily bonus (24h), calendar aggregation."""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from database.models import PointsTransaction, User

SIGNUP_BONUS = 200
DAILY_BONUS = 100
SIGNUP_REASON = "signup_bonus"
DAILY_REASON = "daily_login_bonus"
DAILY_COOLDOWN = timedelta(hours=24)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def today_utc() -> date:
    return now_utc().date()


def record_signup_bonus(db, user: User) -> PointsTransaction:
    """Ledger entry for the default 200 SP (balance already set by column default)."""
    txn = PointsTransaction(
        user_id=user.id,
        amount=SIGNUP_BONUS,
        reason=SIGNUP_REASON,
    )
    db.add(txn)
    return txn


def _as_datetime(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    if isinstance(value, str):
        raw = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            return datetime.fromisoformat(value[:10]).replace(tzinfo=timezone.utc)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


def _last_claim_at(user: User) -> datetime | None:
    return _as_datetime(getattr(user, "last_daily_bonus_at", None)) or _as_datetime(
        getattr(user, "last_daily_bonus_date", None)
    )


def claim_daily_bonus(db, user: User, *, at: datetime | None = None) -> dict:
    """
    Grant +100 SP once every 24 hours.
    Safe to call repeatedly — within cooldown returns already_claimed=True.
    """
    claim_at = at or now_utc()
    if claim_at.tzinfo is None:
        claim_at = claim_at.replace(tzinfo=timezone.utc)

    last = _last_claim_at(user)
    last_iso = last.isoformat() if last else None

    if last and (claim_at - last) < DAILY_COOLDOWN:
        remaining = DAILY_COOLDOWN - (claim_at - last)
        return {
            "claimed": False,
            "already_claimed": True,
            "amount": 0,
            "balance": user.points_balance,
            "streak": user.streak or 0,
            "last_daily_bonus_at": last_iso,
            "last_daily_bonus_date": last.date().isoformat() if last else None,
            "next_claim_in_seconds": max(0, int(remaining.total_seconds())),
        }

    if last and (claim_at - last) <= timedelta(hours=48):
        user.streak = (user.streak or 0) + 1
    else:
        user.streak = 1

    user.points_balance = (user.points_balance or 0) + DAILY_BONUS
    user.last_daily_bonus_at = claim_at
    if hasattr(user, "last_daily_bonus_date"):
        user.last_daily_bonus_date = claim_at.date()

    db.add(PointsTransaction(
        user_id=user.id,
        amount=DAILY_BONUS,
        reason=DAILY_REASON,
    ))
    db.flush()

    return {
        "claimed": True,
        "already_claimed": False,
        "amount": DAILY_BONUS,
        "balance": user.points_balance,
        "streak": user.streak,
        "last_daily_bonus_at": claim_at.isoformat(),
        "last_daily_bonus_date": claim_at.date().isoformat(),
        "next_claim_in_seconds": int(DAILY_COOLDOWN.total_seconds()),
    }


def mark_welcome_seen(db, user: User) -> dict:
    user.has_seen_welcome_popup = True
    db.flush()
    return {"has_seen_welcome_popup": True}


def points_calendar(db, user_id: int, year: int, month: int) -> dict:
    """Monthly grid of SP earned/spent, keyed by day-of-month."""
    last_day = monthrange(year, month)[1]
    start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
    end_dt = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

    rows = (
        db.query(PointsTransaction)
        .filter(
            PointsTransaction.user_id == user_id,
            PointsTransaction.created_at >= start_dt,
            PointsTransaction.created_at <= end_dt,
        )
        .all()
    )

    by_day: dict[int, dict] = defaultdict(lambda: {
        "points": 0,
        "earned": 0,
        "spent": 0,
        "reasons": [],
        "has_daily_bonus": False,
        "has_activity": False,
    })

    for t in rows:
        if not t.created_at:
            continue
        created = t.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        day = created.astimezone(timezone.utc).date().day
        entry = by_day[day]
        entry["points"] += t.amount
        if t.amount > 0:
            entry["earned"] += t.amount
        else:
            entry["spent"] += t.amount
        entry["has_activity"] = True
        if t.reason and t.reason not in entry["reasons"]:
            entry["reasons"].append(t.reason)
        if t.reason == DAILY_REASON:
            entry["has_daily_bonus"] = True

    days = []
    for d in range(1, last_day + 1):
        info = by_day.get(d)
        days.append({
            "day": d,
            "date": date(year, month, d).isoformat(),
            "points": info["points"] if info else 0,
            "earned": info["earned"] if info else 0,
            "spent": info["spent"] if info else 0,
            "reasons": info["reasons"] if info else [],
            "has_daily_bonus": bool(info and info["has_daily_bonus"]),
            "has_activity": bool(info and info["has_activity"]),
        })

    return {
        "year": year,
        "month": month,
        "days_in_month": last_day,
        "today": today_utc().isoformat(),
        "days": days,
    }

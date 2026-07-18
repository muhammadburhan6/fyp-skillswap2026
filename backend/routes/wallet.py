from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.models import PointsTransaction, SessionLocal, User
from services.points_service import (
    DAILY_BONUS,
    claim_daily_bonus,
    mark_welcome_seen,
    points_calendar,
    _last_claim_at,
    now_utc,
    DAILY_COOLDOWN,
)
from utils.auth_middleware import require_auth

wallet_bp = Blueprint("wallet", __name__)


def _owned_or_admin(user, user_id: int) -> bool:
    return user.id == user_id or user.role == "admin"


@wallet_bp.route("/<int:user_id>", methods=["GET"])
@require_auth
def get_wallet(user, user_id):
    if not _owned_or_admin(user, user_id):
        return jsonify({"error": "Forbidden"}), 403

    db = SessionLocal()
    try:
        u = db.query(User).get(user_id)
        if not u:
            return jsonify({"error": "User not found"}), 404
        last = _last_claim_at(u)
        can_claim = True
        next_in = 0
        if last:
            elapsed = now_utc() - last
            if elapsed < DAILY_COOLDOWN:
                can_claim = False
                next_in = int((DAILY_COOLDOWN - elapsed).total_seconds())
        return jsonify({
            "balance": u.points_balance,
            "xp": u.xp,
            "level": u.level,
            "streak": u.streak or 0,
            "has_seen_welcome_popup": bool(u.has_seen_welcome_popup),
            "last_daily_bonus_at": last.isoformat() if last else None,
            "last_daily_bonus_date": last.date().isoformat() if last else None,
            "can_claim_daily": can_claim,
            "next_claim_in_seconds": next_in,
            "daily_bonus_amount": DAILY_BONUS,
        })
    finally:
        db.close()


@wallet_bp.route("/<int:user_id>/transactions", methods=["GET"])
@require_auth
def transactions(user, user_id):
    if not _owned_or_admin(user, user_id):
        return jsonify({"error": "Forbidden"}), 403
    db = SessionLocal()
    try:
        rows = (
            db.query(PointsTransaction)
            .filter_by(user_id=user_id)
            .order_by(PointsTransaction.created_at.desc())
            .all()
        )
        return jsonify({
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "reason": t.reason,
                    "session_id": t.session_id,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in rows
            ]
        })
    finally:
        db.close()


@wallet_bp.route("/daily-bonus", methods=["POST"])
@require_auth
def daily_bonus(user):
    """Claim +100 SP login bonus (idempotent — once per 24 hours)."""
    db = SessionLocal()
    try:
        u = db.query(User).get(user.id)
        if not u:
            return jsonify({"error": "User not found"}), 404
        result = claim_daily_bonus(db, u)
        db.commit()
        return jsonify(result)
    except Exception:
        db.rollback()
        return jsonify({"error": "Could not claim daily bonus"}), 500
    finally:
        db.close()


@wallet_bp.route("/welcome-seen", methods=["POST"])
@require_auth
def welcome_seen(user):
    db = SessionLocal()
    try:
        u = db.query(User).get(user.id)
        if not u:
            return jsonify({"error": "User not found"}), 404
        result = mark_welcome_seen(db, u)
        db.commit()
        return jsonify(result)
    except Exception:
        db.rollback()
        return jsonify({"error": "Could not update welcome flag"}), 500
    finally:
        db.close()


@wallet_bp.route("/calendar", methods=["GET"])
@require_auth
def calendar(user):
    now = datetime.now(timezone.utc)
    try:
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid year/month"}), 400
    if month < 1 or month > 12:
        return jsonify({"error": "Month must be 1–12"}), 400

    db = SessionLocal()
    try:
        data = points_calendar(db, user.id, year, month)
        u = db.query(User).get(user.id)
        data["streak"] = u.streak if u else 0
        return jsonify(data)
    finally:
        db.close()

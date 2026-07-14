from flask import Blueprint, jsonify

from database.models import PointsTransaction, SessionLocal
from utils.auth_middleware import require_auth

wallet_bp = Blueprint("wallet", __name__)


@wallet_bp.route("/<int:user_id>", methods=["GET"])
@require_auth
def get_wallet(user, user_id):
    if user.id != user_id and user.role != "admin":
        return jsonify({"error": "Forbidden"}), 403
    return jsonify({"balance": user.points_balance, "xp": user.xp, "level": user.level})


@wallet_bp.route("/<int:user_id>/transactions", methods=["GET"])
@require_auth
def transactions(user, user_id):
    if user.id != user_id and user.role != "admin":
        return jsonify({"error": "Forbidden"}), 403
    db = SessionLocal()
    try:
        rows = db.query(PointsTransaction).filter_by(user_id=user_id).order_by(PointsTransaction.created_at.desc()).all()
        return jsonify({
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "reason": t.reason,
                    "session_id": t.session_id,
                    "created_at": t.created_at.isoformat(),
                }
                for t in rows
            ]
        })
    finally:
        db.close()

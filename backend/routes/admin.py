from flask import Blueprint, jsonify, request

from database.models import SessionLocal, User
from utils.auth_middleware import require_admin

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/stats", methods=["GET"])
@require_admin
def stats(admin):
    db = SessionLocal()
    try:
        return jsonify({
            "total_users": db.query(User).count(),
            "active_users": db.query(User).filter(User.streak > 0).count(),
            "platform_health": "healthy",
        })
    finally:
        db.close()


@admin_bp.route("/users", methods=["GET"])
@require_admin
def all_users(admin):
    db = SessionLocal()
    try:
        from utils.serializers import user_to_dict
        users = db.query(User).all()
        return jsonify({"users": [user_to_dict(u) for u in users]})
    finally:
        db.close()


@admin_bp.route("/tokens/distribute", methods=["POST"])
@require_admin
def distribute(admin):
    data = request.get_json() or {}
    amount = int(data.get("amount", 100))
    db = SessionLocal()
    try:
        for u in db.query(User).all():
            u.points_balance += amount
        db.commit()
        return jsonify({"message": f"Distributed {amount} points to all users"})
    finally:
        db.close()

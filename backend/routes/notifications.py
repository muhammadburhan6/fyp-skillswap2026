from flask import Blueprint, jsonify

from database.models import Notification, SessionLocal
from utils.auth_middleware import require_auth

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@require_auth
def list_notifications(user):
    db = SessionLocal()
    try:
        rows = db.query(Notification).filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
        return jsonify({
            "notifications": [
                {"id": n.id, "type": n.type, "payload": n.payload, "read": n.read, "created_at": n.created_at.isoformat()}
                for n in rows
            ]
        })
    finally:
        db.close()


@notifications_bp.route("/<int:notif_id>/read", methods=["PATCH"])
@require_auth
def mark_read(user, notif_id):
    db = SessionLocal()
    try:
        notif = db.get(Notification, notif_id)
        if not notif or notif.user_id != user.id:
            return jsonify({"error": "Not found"}), 404
        notif.read = True
        db.commit()
        return jsonify({"id": notif.id, "read": True})
    finally:
        db.close()


@notifications_bp.route("/read-all", methods=["PATCH"])
@require_auth
def mark_all_read(user):
    db = SessionLocal()
    try:
        updated = (
            db.query(Notification)
            .filter(Notification.user_id == user.id, Notification.read.is_(False))
            .update({Notification.read: True}, synchronize_session=False)
        )
        db.commit()
        return jsonify({"updated": updated})
    finally:
        db.close()

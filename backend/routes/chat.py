from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.models import Conversation, Message, SessionLocal, User
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/", methods=["GET"])
@require_auth
def list_conversations(user):
    db = SessionLocal()
    try:
        u = db.query(User).get(user.id)
        result = []
        for conv in u.conversations:
            other = next((p for p in conv.participants if p.id != user.id), None)
            last = db.query(Message).filter_by(conversation_id=conv.id).order_by(Message.created_at.desc()).first()
            unread = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.sender_id != user.id,
                Message.read_at.is_(None),
            ).count()
            result.append({
                "id": conv.id,
                "other_user": user_to_dict(other) if other else None,
                "last_message_preview": last.content[:80] if last else "",
                "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
                "unread": unread,
            })
        return jsonify({"conversations": result})
    finally:
        db.close()


@chat_bp.route("/<int:conv_id>/messages", methods=["GET"])
@require_auth
def get_messages(user, conv_id):
    db = SessionLocal()
    try:
        messages = db.query(Message).filter_by(conversation_id=conv_id).order_by(Message.created_at).all()
        for m in messages:
            if m.sender_id != user.id and not m.read_at:
                m.read_at = datetime.now(timezone.utc)
        db.commit()
        return jsonify({
            "messages": [
                {
                    "id": m.id,
                    "sender_id": m.sender_id,
                    "content": m.content,
                    "type": m.msg_type,
                    "created_at": m.created_at.isoformat(),
                }
                for m in messages
            ]
        })
    finally:
        db.close()


@chat_bp.route("/<int:conv_id>/messages", methods=["POST"])
@require_auth
def send_message(user, conv_id):
    data = request.get_json() or {}
    content = data.get("text") or data.get("content", "")
    db = SessionLocal()
    try:
        msg = Message(conversation_id=conv_id, sender_id=user.id, content=content.strip())
        db.add(msg)
        conv = db.query(Conversation).get(conv_id)
        conv.last_message_at = datetime.now(timezone.utc)
        db.commit()
        return jsonify({
            "message": {
                "id": msg.id,
                "sender_id": msg.sender_id,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
        }), 201
    finally:
        db.close()

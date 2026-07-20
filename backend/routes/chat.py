from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.models import Conversation, Message, SessionLocal, User
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict
from utils.uploads import UploadError, save_upload

chat_bp = Blueprint("chat", __name__)


def _message_dict(m: Message) -> dict:
    return {
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "content": m.content or "",
        "type": m.msg_type or "text",
        "attachment_url": m.attachment_url,
        "attachment_name": m.attachment_name,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _preview(msg) -> str:
    if not msg:
        return ""
    if msg.msg_type == "image":
        return "📷 Photo"
    if msg.msg_type == "video":
        return "🎬 Video"
    if msg.msg_type == "file":
        return f"📎 {msg.attachment_name or 'File'}"
    return (msg.content or "")[:80]


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
                "last_message_preview": _preview(last),
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
        return jsonify({"messages": [_message_dict(m) for m in messages]})
    finally:
        db.close()


@chat_bp.route("/<int:conv_id>/messages", methods=["POST"])
@require_auth
def send_message(user, conv_id):
    data = request.get_json() or {}
    content = (data.get("text") or data.get("content") or "").strip()
    msg_type = data.get("type") or "text"
    attachment_url = data.get("attachment_url")
    attachment_name = data.get("attachment_name")
    if not content and not attachment_url:
        return jsonify({"error": "Message cannot be empty"}), 400

    db = SessionLocal()
    try:
        from services.notification_service import notify

        msg = Message(
            conversation_id=conv_id,
            sender_id=user.id,
            content=content or (attachment_name or ""),
            msg_type=msg_type,
            attachment_url=attachment_url,
            attachment_name=attachment_name,
        )
        db.add(msg)
        conv = db.query(Conversation).get(conv_id)
        if conv:
            conv.last_message_at = datetime.now(timezone.utc)
            preview = content or (attachment_name or "sent an attachment")
            for participant in conv.participants:
                if participant.id != user.id:
                    notify(db, participant.id, "message", {
                        "conversation_id": conv_id,
                        "from_user_id": user.id,
                        "from_name": user.name or "Someone",
                        "preview": preview,
                    })
        db.commit()
        return jsonify({"message": _message_dict(msg)}), 201
    finally:
        db.close()


@chat_bp.route("/upload", methods=["POST"])
@require_auth
def upload_attachment(user):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    try:
        result = save_upload(request.files["file"], subdir="")
    except UploadError as exc:
        return jsonify({"error": exc.message}), exc.status
    return jsonify(result), 201

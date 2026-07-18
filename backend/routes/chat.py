from datetime import datetime, timezone
import os
import uuid
from pathlib import Path

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from database.models import Conversation, Message, SessionLocal, User
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

chat_bp = Blueprint("chat", __name__)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp", "pdf", "doc", "docx",
    "txt", "zip", "rar", "ppt", "pptx", "xls", "xlsx", "mp4", "mp3", "webm", "mov", "m4v",
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB (screen recordings / videos)


def _uploads_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTENSIONS


def _is_image(filename: str) -> bool:
    return filename.rsplit(".", 1)[-1].lower() in {"png", "jpg", "jpeg", "gif", "webp"}


def _is_video(filename: str) -> bool:
    return filename.rsplit(".", 1)[-1].lower() in {"mp4", "webm", "mov", "m4v"}


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
        db.commit()
        return jsonify({"message": _message_dict(msg)}), 201
    finally:
        db.close()


@chat_bp.route("/upload", methods=["POST"])
@require_auth
def upload_attachment(user):
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    if not _allowed(file.filename):
        return jsonify({"error": "File type not allowed. Use images, video (mp4/webm), PDF, or Office files."}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        return jsonify({"error": f"File too large (max {mb} MB). Compress the video or send a shorter clip."}), 400

    raw_name = file.filename
    original = secure_filename(raw_name) or f"file.{raw_name.rsplit('.', 1)[-1].lower()}"
    ext = original.rsplit(".", 1)[-1].lower()
    stored = f"{uuid.uuid4().hex}.{ext}"
    dest = _uploads_dir() / stored
    file.save(dest)

    url = f"/uploads/{stored}"
    if _is_image(original):
        msg_type = "image"
    elif _is_video(original):
        msg_type = "video"
    else:
        msg_type = "file"
    return jsonify({
        "url": url,
        "name": original,
        "type": msg_type,
        "size": size,
    }), 201

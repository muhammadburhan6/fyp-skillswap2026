"""SkillSwap Flask + Socket.IO application."""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from config import Config
from database.models import SessionLocal, User, init_db
from utils.jwt_utils import decode_token
from utils.limiter import limiter
from database.mysql_setup import ensure_mysql_database
from routes.admin import admin_bp
from routes.ai import ai_bp
from routes.auth import auth_bp
from routes.chat import chat_bp, UPLOAD_DIR
from routes.dashboard import dashboard_bp
from routes.matches import matches_bp
from routes.newsletter import newsletter_bp
from routes.notifications import notifications_bp
from routes.progress import progress_bp
from routes.recommendations import recommendations_bp
from routes.reviews import reviews_bp
from routes.sessions import sessions_bp
from routes.users import users_bp
from routes.wallet import wallet_bp
from services.seed_db import seed_database

socketio = SocketIO(cors_allowed_origins="*", async_mode="eventlet")
online_users = set()
# Maps socket session id (sid) -> verified user id from the connection JWT.
sid_to_user = {}


def _authed_user_id():
    """Return the verified user id bound to the current socket connection."""
    return sid_to_user.get(request.sid)


def _print_mysql_help(error: Exception) -> None:
    print("\n=== MySQL connection failed ===")
    print("Sign-up/login needs MySQL running. Choose one option:\n")
    print("  A) XAMPP: install from https://www.apachefriends.org and start MySQL")
    print("  B) Docker:  docker compose up -d mysql  (set MYSQL_PASSWORD=root in backend/.env)")
    print("  C) MySQL:   install MySQL Server and update backend/.env\n")
    print(f"Error: {error}\n")


def create_app(config_class: type = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

    CORS(
        app,
        resources={
            r"/api/*": {"origins": config_class.CORS_ORIGINS},
            r"/uploads/*": {"origins": config_class.CORS_ORIGINS},
        },
        supports_credentials=True,
    )

    limiter.init_app(app)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(UPLOAD_DIR, filename)

    @app.errorhandler(429)
    def ratelimit_handler(error):
        return jsonify({
            "error": "Too many requests. Please slow down and try again shortly.",
            "detail": str(error.description),
        }), 429

    try:
        if config_class.SQLALCHEMY_DATABASE_URI.startswith("mysql"):
            ensure_mysql_database()
        init_db()
        seed_database()
    except Exception as exc:
        _print_mysql_help(exc)
        raise SystemExit(1) from exc

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "SkillSwap API",
            "database": config_class.database_label(),
        })

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(matches_bp, url_prefix="/api/matches")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(chat_bp, url_prefix="/api/conversations")
    app.register_blueprint(wallet_bp, url_prefix="/api/wallet")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(newsletter_bp, url_prefix="/api/newsletter")
    app.register_blueprint(recommendations_bp, url_prefix="/api/recommendations")
    app.register_blueprint(reviews_bp, url_prefix="/api/reviews")

    socketio.init_app(app)
    register_socket_events()
    return app


def register_socket_events():
    @socketio.on("connect")
    def on_connect(auth=None):
        token = (auth or {}).get("token") if isinstance(auth, dict) else None
        claims = decode_token(token)
        if not claims or claims.get("user_id") is None:
            return False  # reject unauthenticated connections

        user_id = claims["user_id"]
        sid_to_user[request.sid] = user_id
        join_room(f"user_{user_id}")
        online_users.add(user_id)
        emit("connected", {"status": "ok", "user_id": user_id})
        emit("presence:update", {"online": list(online_users)}, broadcast=True)
        return True

    @socketio.on("presence:join")
    def on_presence_join(data=None):
        user_id = _authed_user_id()
        if user_id is None:
            return
        online_users.add(user_id)
        join_room(f"user_{user_id}")
        emit("presence:update", {"online": list(online_users)}, broadcast=True)

    @socketio.on("disconnect")
    def on_disconnect():
        user_id = sid_to_user.pop(request.sid, None)
        if user_id is not None and user_id not in sid_to_user.values():
            online_users.discard(user_id)
            emit("presence:update", {"online": list(online_users)}, broadcast=True)

    @socketio.on("conversation:join")
    def on_conversation_join(data=None):
        if _authed_user_id() is None:
            return
        conv_id = (data or {}).get("conversation_id")
        if conv_id:
            join_room(f"conv_{conv_id}")

    @socketio.on("conversation:leave")
    def on_conversation_leave(data=None):
        if _authed_user_id() is None:
            return
        conv_id = (data or {}).get("conversation_id")
        if conv_id:
            leave_room(f"conv_{conv_id}")

    @socketio.on("message:send")
    def on_message_send(data):
        from database.models import Conversation, Message
        from datetime import datetime, timezone
        from services.notification_service import notify

        sender_id = _authed_user_id()
        if sender_id is None:
            return

        db = SessionLocal()
        try:
            conv_id = data.get("conversation_id")
            content = (data.get("content") or "").strip()
            attachment_url = data.get("attachment_url")
            attachment_name = data.get("attachment_name")
            msg_type = data.get("type") or ("image" if attachment_url else "text")
            if attachment_url and msg_type == "text":
                # Infer from filename if type omitted
                name = (attachment_name or attachment_url or "").lower()
                if name.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                    msg_type = "image"
                elif name.endswith((".mp4", ".webm", ".mov", ".m4v")):
                    msg_type = "video"
                else:
                    msg_type = "file"
            if not conv_id or (not content and not attachment_url):
                return

            msg = Message(
                conversation_id=conv_id,
                sender_id=sender_id,
                content=content or (attachment_name or ""),
                msg_type=msg_type,
                attachment_url=attachment_url,
                attachment_name=attachment_name,
            )
            db.add(msg)
            conv = db.query(Conversation).get(conv_id)
            if conv:
                conv.last_message_at = datetime.now(timezone.utc)
                for participant in conv.participants:
                    if participant.id != sender_id:
                        notify(db, participant.id, "message", {"conversation_id": conv_id, "from_user_id": sender_id})
            db.commit()

            payload = {
                "id": msg.id,
                "conversation_id": conv_id,
                "sender_id": sender_id,
                "content": msg.content,
                "type": msg.msg_type,
                "attachment_url": msg.attachment_url,
                "attachment_name": msg.attachment_name,
                "created_at": msg.created_at.isoformat(),
            }
            emit("message:receive", payload, room=f"conv_{conv_id}", broadcast=True)
        finally:
            db.close()

    @socketio.on("typing:start")
    def on_typing_start(data):
        if _authed_user_id() is None:
            return
        emit("typing:start", data, room=f"conv_{data.get('conversation_id')}", include_self=False)

    @socketio.on("typing:stop")
    def on_typing_stop(data):
        if _authed_user_id() is None:
            return
        emit("typing:stop", data, room=f"conv_{data.get('conversation_id')}", include_self=False)


app = create_app()


if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=Config.DEBUG,
        use_reloader=False,
    )

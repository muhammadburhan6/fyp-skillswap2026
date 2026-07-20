from flask import Blueprint, jsonify, request

from config import Config
from database.models import SessionLocal, User
from services.email_service import send_password_reset, send_welcome
from services.points_service import record_signup_bonus
from utils.jwt_utils import decode_token, generate_purpose_token, generate_token
from utils.limiter import limiter
from utils.passwords import hash_password, verify_password
from utils.serializers import user_to_dict

auth_bp = Blueprint("auth", __name__)

RESET_TOKEN_MINUTES = 30


def _verify_firebase_id_token(id_token: str) -> dict | None:
    """Verify a Firebase Auth ID token. Returns claims dict or None."""
    project_id = Config.FIREBASE_PROJECT_ID
    if not project_id or not id_token:
        return None
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        return google_id_token.verify_firebase_token(
            id_token,
            google_requests.Request(),
            audience=project_id,
        )
    except Exception:
        return None


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        # Google-only accounts have no password_hash — reject password login.
        if not user or not verify_password(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401
        if user.status in ("suspended", "banned"):
            return jsonify({"error": "Your account has been suspended. Contact support."}), 403
        token = generate_token(user.id, user.role)
        return jsonify({"user": user_to_dict(user), "token": token})
    finally:
        db.close()


@auth_bp.route("/google", methods=["POST"])
@limiter.limit("10 per minute")
def google_login():
    """Exchange a Firebase ID token for a SkillSwap JWT."""
    if not Config.FIREBASE_PROJECT_ID:
        return jsonify({"error": "Google sign-in is not configured on the server."}), 503

    data = request.get_json() or {}
    id_token = (data.get("id_token") or data.get("idToken") or "").strip()
    if not id_token:
        return jsonify({"error": "Firebase ID token is required"}), 400

    claims = _verify_firebase_id_token(id_token)
    if not claims:
        return jsonify({"error": "Invalid or expired Google sign-in. Try again."}), 401

    email = (claims.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Google account email is required"}), 400
    if claims.get("email_verified") is False:
        return jsonify({"error": "Please verify your Google email first."}), 403

    name = (claims.get("name") or claims.get("given_name") or email.split("@")[0]).strip()
    picture = (claims.get("picture") or "").strip()

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
        created = False
        if not user:
            user = User(
                name=name[:120] or "Google User",
                email=email,
                password_hash=None,
                avatar_url=picture[:512] if picture else "",
                status="verified",
                has_seen_welcome_popup=False,
            )
            db.add(user)
            db.flush()
            record_signup_bonus(db, user)
            created = True
        else:
            if user.status in ("suspended", "banned"):
                return jsonify({"error": "Your account has been suspended. Contact support."}), 403
            # Refresh profile fields from Google when empty / outdated avatar.
            if name and (not user.name or user.name == "New User"):
                user.name = name[:120]
            if picture and not user.avatar_url:
                user.avatar_url = picture[:512]

        db.commit()
        db.refresh(user)

        if created:
            try:
                send_welcome(user.email, user.name)
            except Exception:
                pass

        token = generate_token(user.id, user.role)
        return jsonify({"user": user_to_dict(user), "token": token}), (201 if created else 200)
    except Exception:
        db.rollback()
        return jsonify({"error": "Could not complete Google sign-in. Please try again."}), 500
    finally:
        db.close()


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("display_name") or data.get("name", "New User")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = SessionLocal()
    try:
        if db.query(User).filter_by(email=email).first():
            return jsonify({"error": "An account with this email already exists"}), 409

        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            has_seen_welcome_popup=False,
        )
        db.add(user)
        db.flush()  # assign user.id
        record_signup_bonus(db, user)
        db.commit()
        db.refresh(user)
        try:
            send_welcome(user.email, user.name)
        except Exception:
            pass  # account creation must never fail because of email
        token = generate_token(user.id, user.role)
        return jsonify({"user": user_to_dict(user), "token": token}), 201
    except Exception:
        db.rollback()
        return jsonify({"error": "Could not create account. Please try again."}), 500
    finally:
        db.close()


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("3 per hour")
def forgot_password():
    """Forgot-password flow.

    Preferred FYP UX: client sends email + new password (+ confirm on UI).
    If the email exists, the password is updated immediately.

    Legacy / email-link mode: if only email is sent, a reset link is emailed
    (and returned in DEBUG when SMTP fails).
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    new_password = (data.get("password") or data.get("new_password") or "").strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # --- Direct reset: email + new password (confirm is validated on the client) ---
    if new_password:
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # Generic message so we don't reveal whether the email is registered.
        generic_ok = {"message": "If that email is registered, your password has been updated. You can log in now."}

        db = SessionLocal()
        try:
            user = db.query(User).filter_by(email=email).first()
            if user:
                user.password_hash = hash_password(new_password)
                db.commit()
            return jsonify(generic_ok)
        except Exception:
            db.rollback()
            return jsonify({"error": "Could not update password. Please try again."}), 500
        finally:
            db.close()

    # --- Email-link mode (no password in body) ---
    generic = {"message": "If that email is registered, a reset link has been sent."}

    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email=email).first()
    finally:
        db.close()

    if not user:
        return jsonify(generic)

    reset_token = generate_purpose_token(user.id, "reset", RESET_TOKEN_MINUTES)
    reset_link = f"{Config.FRONTEND_URL.rstrip('/')}/reset-password?token={reset_token}"

    sent = send_password_reset(email, reset_link)

    response = dict(generic)
    # In dev, when email isn't configured, return the link so the flow is testable.
    if not sent and Config.DEBUG:
        response["reset_link"] = reset_link
    return jsonify(response)


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = data.get("token", "")
    new_password = data.get("password", "")

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    claims = decode_token(token)
    if not claims or claims.get("purpose") != "reset" or claims.get("user_id") is None:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    db = SessionLocal()
    try:
        user = db.get(User, int(claims["user_id"]))
        if not user:
            return jsonify({"error": "Invalid or expired reset link"}), 400
        user.password_hash = hash_password(new_password)
        db.commit()
        return jsonify({"message": "Password updated. You can now log in."})
    finally:
        db.close()

from flask import Blueprint, jsonify, request

from config import Config
from database.models import SessionLocal, User
from services.email_service import send_password_reset
from utils.jwt_utils import decode_token, generate_purpose_token, generate_token
from utils.limiter import limiter
from utils.passwords import hash_password, verify_password
from utils.serializers import user_to_dict

auth_bp = Blueprint("auth", __name__)

RESET_TOKEN_MINUTES = 30


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
        if not user or not verify_password(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401
        token = generate_token(user.id, user.role)
        return jsonify({"user": user_to_dict(user), "token": token})
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

        user = User(name=name, email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
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
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    # Always return a generic success to avoid leaking which emails are registered.
    generic = {"message": "If that email is registered, a reset link has been sent."}

    if not email:
        return jsonify({"error": "Email is required"}), 400

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

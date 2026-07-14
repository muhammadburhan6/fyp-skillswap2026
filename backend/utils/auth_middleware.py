from functools import wraps

from flask import jsonify, request
from sqlalchemy.orm import joinedload

from database.models import SessionLocal, User
from utils.jwt_utils import decode_token


def _extract_bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header[len("Bearer "):].strip() or None


def get_current_user():
    token = _extract_bearer_token()
    if not token:
        return None
    claims = decode_token(token)
    if not claims:
        return None
    user_id = claims.get("user_id")
    if user_id is None:
        return None
    db = SessionLocal()
    try:
        # Eager-load skill relationships so the returned (soon-detached) user can
        # still be serialized after this session closes.
        return (
            db.query(User)
            .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
            .filter(User.id == int(user_id))
            .first()
        )
    except (TypeError, ValueError):
        return None
    finally:
        db.close()


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return f(user, *args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if user.role != "admin":
            return jsonify({"error": "Forbidden"}), 403
        return f(user, *args, **kwargs)
    return decorated

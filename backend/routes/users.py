from flask import Blueprint, jsonify, request

from database.models import SessionLocal, User
from services.recommendation_service import invalidate_cache
from services.skill_utils import get_or_create_skill
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

users_bp = Blueprint("users", __name__)


def _apply_skills(db, user, teach_names, learn_names):
    """Replace teach/learn skill lists using case-insensitive skill lookup."""
    if teach_names is not None:
        user.skills_teach.clear()
        for name in teach_names:
            skill = get_or_create_skill(db, name)
            if skill and skill not in user.skills_teach:
                user.skills_teach.append(skill)
    if learn_names is not None:
        user.skills_learn.clear()
        for name in learn_names:
            skill = get_or_create_skill(db, name)
            if skill and skill not in user.skills_learn:
                user.skills_learn.append(skill)


@users_bp.route("/me", methods=["GET"])
@require_auth
def get_me(user):
    return jsonify({"user": user_to_dict(user)})


@users_bp.route("/me", methods=["PUT"])
@require_auth
def update_me(user):
    data = request.get_json() or {}
    db = SessionLocal()
    try:
        u = db.get(User, user.id)
        for field in ("name", "bio", "avatar_url", "availability"):
            if field in data:
                setattr(u, field, data[field])
        teach = data.get("skills_teach") if "skills_teach" in data else None
        learn = data.get("skills_learn") if "skills_learn" in data else None
        if teach is not None or learn is not None:
            _apply_skills(db, u, teach, learn)
        db.commit()
        db.refresh(u)
        invalidate_cache(u.id)
        return jsonify({"user": user_to_dict(u)})
    finally:
        db.close()


@users_bp.route("/onboarding", methods=["POST"])
@require_auth
def onboarding(user):
    data = request.get_json() or {}
    db = SessionLocal()
    try:
        u = db.get(User, user.id)
        u.name = data.get("display_name", u.name)
        u.bio = data.get("bio", u.bio)
        u.availability = data.get("availability", u.availability)
        u.onboarding_complete = True
        _apply_skills(
            db,
            u,
            data.get("skills_teach", []),
            data.get("skills_learn", []),
        )
        db.commit()
        db.refresh(u)
        invalidate_cache(u.id)
        return jsonify({"user": user_to_dict(u)})
    finally:
        db.close()


@users_bp.route("/<int:user_id>", methods=["GET"])
@require_auth
def get_user(current_user, user_id):
    db = SessionLocal()
    try:
        u = db.get(User, user_id)
        if not u:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"user": user_to_dict(u)})
    finally:
        db.close()

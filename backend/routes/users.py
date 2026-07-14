from flask import Blueprint, jsonify, request

from database.models import SessionLocal, User
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

users_bp = Blueprint("users", __name__)


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
        db.commit()
        db.refresh(u)
        return jsonify({"user": user_to_dict(u)})
    finally:
        db.close()


@users_bp.route("/onboarding", methods=["POST"])
@require_auth
def onboarding(user):
    data = request.get_json() or {}
    db = SessionLocal()
    try:
        from database.models import Skill
        u = db.get(User, user.id)
        u.name = data.get("display_name", u.name)
        u.bio = data.get("bio", u.bio)
        u.availability = data.get("availability", u.availability)
        u.onboarding_complete = True
        u.skills_teach.clear()
        u.skills_learn.clear()
        for name in data.get("skills_teach", []):
            skill = db.query(Skill).filter_by(name=name).first() or Skill(name=name, category="General")
            if not skill.id:
                db.add(skill)
                db.flush()
            u.skills_teach.append(skill)
        for name in data.get("skills_learn", []):
            skill = db.query(Skill).filter_by(name=name).first() or Skill(name=name, category="General")
            if not skill.id:
                db.add(skill)
                db.flush()
            u.skills_learn.append(skill)
        db.commit()
        db.refresh(u)
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

import logging

from flask import Blueprint, jsonify, request

from database.models import SessionLocal, User
from services.skill_demand_service import analyze_skill_demand
from services.skillbot_service import chat_reply
from utils.auth_middleware import require_auth

ai_bp = Blueprint("ai", __name__)

logger = logging.getLogger(__name__)


@ai_bp.route("/chat", methods=["POST"])
@require_auth
def ai_chat(user):
    data = request.get_json() or {}
    raw_message = data.get("message", "")

    db = SessionLocal()
    try:
        # Re-fetch the user on this session so relationships (skills, badges) load.
        db_user = db.get(User, user.id) or user
        return jsonify(chat_reply(db, db_user, raw_message))
    finally:
        db.close()


@ai_bp.route("/skill-demand", methods=["GET"])
@require_auth
def skill_demand(user):
    """Skill Demand Analysis — trending skills computed from real platform activity."""
    db = SessionLocal()
    try:
        return jsonify(analyze_skill_demand(db))
    finally:
        db.close()

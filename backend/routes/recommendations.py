from flask import Blueprint, jsonify

from database.models import SessionLocal
from services.recommendation_service import get_recommendations
from utils.auth_middleware import require_auth

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/", methods=["GET"])
@require_auth
def list_recommendations(user):
    db = SessionLocal()
    try:
        return jsonify(get_recommendations(db, user.id))
    finally:
        db.close()

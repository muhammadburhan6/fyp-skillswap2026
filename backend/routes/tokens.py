from flask import Blueprint, jsonify

from database import store
from services.token_service import get_or_create_daily_tokens
from utils.auth_middleware import require_auth

tokens_bp = Blueprint("tokens", __name__)


@tokens_bp.route("/daily", methods=["GET"])
@require_auth
def daily_tokens(user):
    token_doc = get_or_create_daily_tokens(user["_id"])
    return jsonify({
        "tokens": token_doc,
        "balance": user.get("heart_tokens_balance", token_doc.get("remaining", 0)),
    })

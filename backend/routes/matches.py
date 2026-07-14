from flask import Blueprint, jsonify, request

from database.models import Match, SessionLocal, User
from services.matching_service import discover_matches
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

matches_bp = Blueprint("matches", __name__)


@matches_bp.route("/discover", methods=["GET"])
@require_auth
def discover(user):
    db = SessionLocal()
    try:
        results = discover_matches(db, user.id)
        return jsonify({
            "matches": [
                {
                    "user": user_to_dict(r["user"]),
                    "match_score": r["match_score"],
                    "skill_offered": r["skill_offered"],
                }
                for r in results
            ]
        })
    finally:
        db.close()


@matches_bp.route("/request", methods=["POST"])
@require_auth
def request_match(user):
    data = request.get_json() or {}
    target_id = data.get("target_user_id")
    db = SessionLocal()
    try:
        from services.matching_service import compute_match_score
        target = db.query(User).get(target_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        score = compute_match_score(user, target)
        match = Match(user_a_id=user.id, user_b_id=target_id, match_score=score, status="pending")
        db.add(match)
        db.commit()
        return jsonify({"match": {"id": match.id, "match_score": score, "status": "pending"}}), 201
    finally:
        db.close()


@matches_bp.route("/accept", methods=["POST"])
@require_auth
def accept_match(user):
    data = request.get_json() or {}
    target_id = data.get("target_user_id")
    db = SessionLocal()
    try:
        from services.matching_service import compute_match_score
        from database.models import Conversation

        current = db.get(User, user.id)
        target = db.get(User, target_id)
        if not target:
            return jsonify({"error": "User not found"}), 404

        match = db.query(Match).filter(
            ((Match.user_a_id == user.id) & (Match.user_b_id == target_id))
            | ((Match.user_a_id == target_id) & (Match.user_b_id == user.id))
        ).first()
        if match:
            match.status = "accepted"
        else:
            score = compute_match_score(current, target)
            match = Match(user_a_id=user.id, user_b_id=target_id, match_score=score, status="accepted")
            db.add(match)

        conv = Conversation()
        conv.participants.extend([current, target])
        db.add(conv)
        db.commit()
        return jsonify({"match": {"id": match.id, "status": "accepted"}, "conversation_id": conv.id})
    finally:
        db.close()

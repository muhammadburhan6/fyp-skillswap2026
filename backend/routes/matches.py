from flask import Blueprint, jsonify, request

from database.models import Match, SessionLocal, User
from services.matching_service import discover_matches
from services.notification_service import notify
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

matches_bp = Blueprint("matches", __name__)


@matches_bp.route("/discover", methods=["GET"])
@require_auth
def discover(user):
    skill_query = (request.args.get("skill") or "").strip() or None
    db = SessionLocal()
    try:
        results = discover_matches(db, user.id, skill_query=skill_query)
        return jsonify({
            "matches": [
                {
                    "user": user_to_dict(r["user"]),
                    "match_score": r["match_score"],
                    "skill_offered": r["skill_offered"],
                    "is_reciprocal": r.get("is_reciprocal", False),
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

        existing = db.query(Match).filter(
            ((Match.user_a_id == user.id) & (Match.user_b_id == target_id))
            | ((Match.user_a_id == target_id) & (Match.user_b_id == user.id)),
            Match.status.in_(["pending", "accepted"]),
        ).first()
        if existing:
            return jsonify({"match": {"id": existing.id, "match_score": existing.match_score, "status": existing.status}}), 200

        score = compute_match_score(user, target)
        match = Match(user_a_id=user.id, user_b_id=target_id, match_score=score, status="pending")
        db.add(match)
        notify(db, target_id, "match_request", {"from_user_id": user.id, "from_name": user.name})
        db.commit()
        return jsonify({"match": {"id": match.id, "match_score": score, "status": "pending"}}), 201
    finally:
        db.close()


@matches_bp.route("/requests", methods=["GET"])
@require_auth
def incoming_requests(user):
    """Pending exchange requests sent TO the current user, for accept/decline."""
    db = SessionLocal()
    try:
        rows = db.query(Match).filter(
            Match.user_b_id == user.id, Match.status == "pending"
        ).order_by(Match.created_at.desc()).all()
        requests_out = []
        for m in rows:
            requester = db.get(User, m.user_a_id)
            if not requester:
                continue
            requests_out.append({
                "match_id": m.id,
                "match_score": m.match_score,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "user": user_to_dict(requester),
            })
        return jsonify({"requests": requests_out})
    finally:
        db.close()


@matches_bp.route("/decline", methods=["POST"])
@require_auth
def decline_match(user):
    data = request.get_json() or {}
    target_id = data.get("target_user_id")
    db = SessionLocal()
    try:
        match = db.query(Match).filter(
            Match.user_a_id == target_id, Match.user_b_id == user.id, Match.status == "pending"
        ).first()
        if not match:
            return jsonify({"error": "No pending request from this user"}), 404
        match.status = "declined"
        notify(db, target_id, "match_declined", {"from_user_id": user.id, "from_name": user.name})
        db.commit()
        return jsonify({"match": {"id": match.id, "status": "declined"}})
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
        notify(db, target_id, "match_accepted", {"from_user_id": user.id, "from_name": user.name})
        db.commit()
        return jsonify({"match": {"id": match.id, "status": "accepted"}, "conversation_id": conv.id})
    finally:
        db.close()

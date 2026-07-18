from flask import Blueprint, jsonify, request

from database.models import Review, Session as SwapSession, SessionLocal
from services.gamification_service import check_and_award_badges
from utils.auth_middleware import require_auth

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/", methods=["POST"])
@require_auth
def create_review(user):
    data = request.get_json() or {}
    session_id = data.get("session_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400

    db = SessionLocal()
    try:
        s = db.get(SwapSession, session_id)
        if not s:
            return jsonify({"error": "Session not found"}), 404
        if s.learner_id != user.id:
            return jsonify({"error": "Only the learner can review this session"}), 403
        if s.status != "completed":
            return jsonify({"error": "Session must be completed before it can be reviewed"}), 400

        existing = (
            db.query(Review)
            .filter_by(session_id=s.id, reviewer_id=user.id)
            .first()
        )
        if existing:
            return jsonify({"error": "You already reviewed this session"}), 409

        review = Review(
            session_id=s.id,
            reviewer_id=user.id,
            reviewee_id=s.teacher_id,
            rating=rating,
            comment=comment,
        )
        db.add(review)
        db.flush()
        check_and_award_badges(db, s.teacher_id)
        db.commit()
        return jsonify({"review": {"id": review.id, "rating": review.rating, "comment": review.comment}}), 201
    finally:
        db.close()


@reviews_bp.route("/user/<int:user_id>", methods=["GET"])
@require_auth
def list_reviews_for_user(user, user_id):
    db = SessionLocal()
    try:
        rows = (
            db.query(Review)
            .filter_by(reviewee_id=user_id)
            .order_by(Review.id.desc())
            .all()
        )
        return jsonify({
            "reviews": [
                {
                    "id": r.id,
                    "session_id": r.session_id,
                    "reviewer_id": r.reviewer_id,
                    "rating": r.rating,
                    "comment": r.comment,
                }
                for r in rows
            ]
        })
    finally:
        db.close()

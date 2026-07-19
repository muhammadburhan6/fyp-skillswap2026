from flask import Blueprint, jsonify, request
from sqlalchemy import func

from database.models import (
    PointsTransaction,
    Review,
    Session as SwapSession,
    SessionLocal,
    Skill,
    User,
)
from services.gamification_service import check_and_award_badges
from services.notification_service import notify
from utils.auth_middleware import require_auth

reviews_bp = Blueprint("reviews", __name__)


def _session_skill_name(db, session_id: int) -> str:
    s = db.get(SwapSession, session_id)
    if not s or not s.skill_id:
        return ""
    skill = db.get(Skill, s.skill_id)
    return skill.name if skill else ""


def _rating_summary(db, user_id: int) -> dict:
    row = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.reviewee_id == user_id)
        .first()
    )
    avg, count = row if row else (None, 0)
    count = int(count or 0)
    return {
        "average_rating": round(float(avg), 1) if count and avg is not None else None,
        "review_count": count,
    }


def rating_summaries_for_users(db, user_ids: list[int]) -> dict[int, dict]:
    """Batch average_rating + review_count for many users. Returns {user_id: summary}."""
    if not user_ids:
        return {}
    rows = (
        db.query(
            Review.reviewee_id,
            func.avg(Review.rating),
            func.count(Review.id),
        )
        .filter(Review.reviewee_id.in_(user_ids))
        .group_by(Review.reviewee_id)
        .all()
    )
    out = {uid: {"average_rating": None, "review_count": 0} for uid in user_ids}
    for reviewee_id, avg, count in rows:
        count = int(count or 0)
        out[reviewee_id] = {
            "average_rating": round(float(avg), 1) if count and avg is not None else None,
            "review_count": count,
        }
    return out


def skill_rating_summaries_for_users(db, user_ids: list[int]) -> dict[tuple[int, str], dict]:
    """Batch ratings grouped by teacher and session skill."""
    if not user_ids:
        return {}
    rows = (
        db.query(
            Review.reviewee_id,
            Skill.name,
            func.avg(Review.rating),
            func.count(Review.id),
        )
        .join(SwapSession, Review.session_id == SwapSession.id)
        .join(Skill, SwapSession.skill_id == Skill.id)
        .filter(Review.reviewee_id.in_(user_ids))
        .group_by(Review.reviewee_id, Skill.name)
        .all()
    )
    out = {}
    for reviewee_id, skill_name, avg, count in rows:
        count = int(count or 0)
        out[(reviewee_id, skill_name.casefold())] = {
            "average_rating": round(float(avg), 1) if count and avg is not None else None,
            "review_count": count,
        }
    return out


@reviews_bp.route("/", methods=["POST"])
@require_auth
def create_review(user):
    data = request.get_json() or {}
    session_id = data.get("session_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    # Accept float-looking ints from JSON (e.g. 5.0) by coercing carefully
    if isinstance(rating, float) and rating == int(rating):
        rating = int(rating)
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

        teacher = db.get(User, s.teacher_id)
        if teacher and rating == 5:
            teacher.points_balance = (teacher.points_balance or 0) + 5
            db.add(PointsTransaction(
                user_id=teacher.id,
                amount=5,
                reason="five_star_review",
                session_id=s.id,
            ))

        check_and_award_badges(db, s.teacher_id)

        skill_name = _session_skill_name(db, s.id)
        if s.teacher_id:
            notify(db, s.teacher_id, "new_review", {
                "review_id": review.id,
                "session_id": s.id,
                "rating": rating,
                "from_user_id": user.id,
                "from_name": user.name,
                "skill": skill_name,
            })

        db.commit()
        return jsonify({
            "review": {
                "id": review.id,
                "session_id": review.session_id,
                "reviewer_id": review.reviewer_id,
                "reviewee_id": review.reviewee_id,
                "rating": review.rating,
                "comment": review.comment,
                "skill": skill_name,
            }
        }), 201
    finally:
        db.close()


@reviews_bp.route("/user/<int:user_id>", methods=["GET"])
@require_auth
def list_reviews_for_user(user, user_id):
    db = SessionLocal()
    try:
        summary = _rating_summary(db, user_id)
        rows = (
            db.query(Review)
            .filter_by(reviewee_id=user_id)
            .order_by(Review.id.desc())
            .limit(20)
            .all()
        )
        reviews = []
        for r in rows:
            reviewer = db.get(User, r.reviewer_id)
            reviews.append({
                "id": r.id,
                "session_id": r.session_id,
                "skill": _session_skill_name(db, r.session_id),
                "reviewer_id": r.reviewer_id,
                "reviewer_name": reviewer.name if reviewer else "",
                "rating": r.rating,
                "comment": r.comment or "",
                "created_at": None,
            })
        return jsonify({
            "average_rating": summary["average_rating"],
            "review_count": summary["review_count"],
            "reviews": reviews,
        })
    finally:
        db.close()

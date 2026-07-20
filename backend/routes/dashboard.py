from flask import Blueprint, jsonify

from database.models import Match, Review, Session as SwapSession, SessionLocal, Skill, User
from services.matching_service import discover_matches
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

dashboard_bp = Blueprint("dashboard", __name__)


def _user_name(db, user_id: int) -> str:
    person = db.get(User, user_id)
    return person.name if person else ""


def _session_skill_name(db, session) -> str:
    if session.skill_id:
        skill = db.get(Skill, session.skill_id)
        if skill:
            return skill.name
    return "this skill"


@dashboard_bp.route("/", methods=["GET"])
@require_auth
def dashboard(user):
    db = SessionLocal()
    try:
        u = db.query(User).get(user.id)
        matches = discover_matches(db, u.id)
        my_matches = db.query(Match).filter(
            (Match.user_a_id == u.id) | (Match.user_b_id == u.id)
        ).count()
        sessions = (
            db.query(SwapSession)
            .filter(
                (SwapSession.teacher_id == u.id) | (SwapSession.learner_id == u.id),
                SwapSession.status.in_(["scheduled", "completed"]),
            )
            .order_by(SwapSession.scheduled_at.desc())
            .all()
        )
        session_ids = [s.id for s in sessions]
        reviewed_ids = set()
        my_ratings = {}
        if session_ids:
            reviewed_ids = {
                r.session_id
                for r in db.query(Review.session_id)
                .filter(Review.session_id.in_(session_ids), Review.reviewer_id == u.id)
                .all()
            }
            if reviewed_ids:
                for r in db.query(Review).filter(
                    Review.session_id.in_(reviewed_ids), Review.reviewer_id == u.id
                ).all():
                    my_ratings[r.session_id] = r.rating

        conv_count = len(u.conversations)
        scheduled = [s for s in sessions if s.status == "scheduled"]

        return jsonify({
            "user": user_to_dict(u),
            "stats": {
                "skill_points": u.points_balance,
                "matches": my_matches or len(matches),
                "chats": conv_count,
                "activity_streak": u.streak,
                "xp": u.xp,
                "level": u.level,
            },
            "progress": [
                {
                    "user_id": r["user"].id,
                    "name": r["user"].name,
                    "skill": r["skill_offered"],
                    "match_score": r["match_score"],
                }
                for r in matches[:3]
            ],
            "today_sessions": [
                {
                    "id": s.id,
                    "teacher_id": s.teacher_id,
                    "teacher_name": _user_name(db, s.teacher_id),
                    "learner_id": s.learner_id,
                    "learner_name": _user_name(db, s.learner_id),
                    "skill": _session_skill_name(db, s),
                    "scheduled_at": s.scheduled_at.isoformat(),
                    "status": s.status,
                    "reviewed_by_me": s.id in reviewed_ids,
                    "my_rating": my_ratings.get(s.id),
                }
                for s in sessions
            ],
            "has_lessons_today": len(scheduled) > 0,
        })
    finally:
        db.close()

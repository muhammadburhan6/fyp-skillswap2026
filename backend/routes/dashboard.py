from flask import Blueprint, jsonify

from database.models import Match, Session as SwapSession, SessionLocal, User
from services.matching_service import discover_matches
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

dashboard_bp = Blueprint("dashboard", __name__)


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
        sessions = db.query(SwapSession).filter(
            (SwapSession.teacher_id == u.id) | (SwapSession.learner_id == u.id),
            SwapSession.status == "scheduled",
        ).all()
        conv_count = len(u.conversations)

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
                {"id": s.id, "scheduled_at": s.scheduled_at.isoformat(), "status": s.status}
                for s in sessions
            ],
            "has_lessons_today": len(sessions) > 0,
        })
    finally:
        db.close()

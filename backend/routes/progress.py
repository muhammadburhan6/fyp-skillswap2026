from flask import Blueprint, jsonify

from database.models import Badge, Session as SwapSession, SessionLocal, UserBadge
from utils.auth_middleware import require_auth

progress_bp = Blueprint("progress", __name__)


@progress_bp.route("/", methods=["GET"])
@require_auth
def progress(user):
    db = SessionLocal()
    try:
        completed = db.query(SwapSession).filter(
            ((SwapSession.teacher_id == user.id) | (SwapSession.learner_id == user.id)),
            SwapSession.status == "completed",
        ).all()
        badges = db.query(UserBadge).filter_by(user_id=user.id).all()
        badge_names = [db.query(Badge).get(b.badge_id).name for b in badges]
        return jsonify({
            "xp": user.xp,
            "level": user.level,
            "skill_points": user.points_balance,
            "sessions_completed": len(completed),
            "badges": badge_names,
            "session_history": [
                {"id": s.id, "status": s.status, "scheduled_at": s.scheduled_at.isoformat()}
                for s in db.query(SwapSession).filter(
                    (SwapSession.teacher_id == user.id) | (SwapSession.learner_id == user.id)
                ).all()
            ],
            "activity_streak": user.streak,
        })
    finally:
        db.close()

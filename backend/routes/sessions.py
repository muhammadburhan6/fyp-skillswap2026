import json
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.models import PointsTransaction, Session as SwapSession, SessionLocal, Skill, User
from services.gamification_service import award_xp, check_and_award_badges
from services.learning_path_service import generate_learning_path, normalize_duration, normalize_level
from services.notification_service import notify
from utils.auth_middleware import require_auth
from utils.serializers import user_to_dict

sessions_bp = Blueprint("sessions", __name__)


def _session_skill_name(db, session) -> str:
    if session.skill_id:
        skill = db.get(Skill, session.skill_id)
        if skill:
            return skill.name
    return "this skill"


def _serialize_learning_path(session):
    if not session.learning_path:
        return None
    try:
        plan = json.loads(session.learning_path)
    except (TypeError, ValueError):
        return None
    return {
        "steps": plan.get("steps", []),
        "resources": plan.get("resources", []),
        "mode": session.learning_path_mode,
        "generated_at": session.learning_path_generated_at.isoformat() if session.learning_path_generated_at else None,
    }


@sessions_bp.route("/", methods=["GET"])
@require_auth
def list_sessions(user):
    db = SessionLocal()
    try:
        rows = db.query(SwapSession).filter(
            (SwapSession.teacher_id == user.id) | (SwapSession.learner_id == user.id)
        ).all()
        return jsonify({
            "sessions": [
                {
                    "id": s.id,
                    "teacher_id": s.teacher_id,
                    "learner_id": s.learner_id,
                    "skill_id": s.skill_id,
                    "skill": _session_skill_name(db, s),
                    "scheduled_at": s.scheduled_at.isoformat(),
                    "status": s.status,
                    "points_cost": s.points_cost,
                    "meeting_link": s.meeting_link,
                    "has_learning_path": bool(s.learning_path),
                }
                for s in rows
            ]
        })
    finally:
        db.close()


@sessions_bp.route("/", methods=["POST"])
@require_auth
def create_session(user):
    data = request.get_json() or {}
    cost = int(data.get("points_cost", 10))
    db = SessionLocal()
    try:
        u = db.query(User).get(user.id)
        if u.points_balance < cost:
            return jsonify({"error": "Insufficient points"}), 400
        u.points_balance -= cost
        db.add(PointsTransaction(user_id=u.id, amount=-cost, reason="session_booking"))

        skill_id = data.get("skill_id")
        if not skill_id and data.get("skill"):
            skill = db.query(Skill).filter_by(name=data["skill"]).first()
            skill_id = skill.id if skill else None

        session = SwapSession(
            teacher_id=data.get("teacher_id", user.id),
            learner_id=data.get("learner_id", user.id),
            skill_id=skill_id,
            scheduled_at=datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00")),
            status="scheduled",
            points_cost=cost,
            meeting_link=data.get("meeting_link", ""),
        )
        db.add(session)
        db.flush()

        other_id = session.learner_id if session.teacher_id == user.id else session.teacher_id
        if other_id and other_id != user.id:
            notify(db, other_id, "session_booked", {"session_id": session.id, "from_user_id": user.id})

        db.commit()
        return jsonify({"session": {"id": session.id, "status": session.status}}), 201
    finally:
        db.close()


@sessions_bp.route("/<int:session_id>", methods=["PATCH"])
@require_auth
def update_session(user, session_id):
    data = request.get_json() or {}
    db = SessionLocal()
    try:
        s = db.query(SwapSession).get(session_id)
        if not s:
            return jsonify({"error": "Not found"}), 404
        if "status" in data:
            s.status = data["status"]
            if data["status"] == "completed" and s.teacher_id:
                db.flush()  # SessionLocal has autoflush=False; badge checks below query session status directly
                teacher = db.query(User).get(s.teacher_id)
                teacher.points_balance += 15
                award_xp(db, teacher, 25)
                db.add(PointsTransaction(user_id=teacher.id, amount=15, reason="teach_session", session_id=s.id))
                check_and_award_badges(db, teacher.id)

                if s.learner_id and s.learner_id != s.teacher_id:
                    learner = db.query(User).get(s.learner_id)
                    if learner:
                        award_xp(db, learner, 15)
                        check_and_award_badges(db, learner.id)
                        notify(db, learner.id, "session_completed", {"session_id": s.id})

                notify(db, teacher.id, "session_completed", {"session_id": s.id})
        if "meeting_link" in data:
            s.meeting_link = data["meeting_link"]
        db.commit()
        return jsonify({"session": {"id": s.id, "status": s.status}})
    finally:
        db.close()


@sessions_bp.route("/<int:session_id>/learning-path", methods=["GET"])
@require_auth
def get_learning_path(user, session_id):
    db = SessionLocal()
    try:
        s = db.get(SwapSession, session_id)
        if not s:
            return jsonify({"error": "Not found"}), 404
        if user.id not in (s.teacher_id, s.learner_id):
            return jsonify({"error": "Forbidden"}), 403
        return jsonify({"learning_path": _serialize_learning_path(s)})
    finally:
        db.close()


@sessions_bp.route("/<int:session_id>/learning-path", methods=["POST"])
@require_auth
def create_learning_path(user, session_id):
    data = request.get_json() or {}
    level = normalize_level(data.get("level"))
    duration = normalize_duration(data.get("duration_minutes"))

    db = SessionLocal()
    try:
        s = db.get(SwapSession, session_id)
        if not s:
            return jsonify({"error": "Not found"}), 404
        if user.id not in (s.teacher_id, s.learner_id):
            return jsonify({"error": "Forbidden"}), 403

        topic = _session_skill_name(db, s)
        plan, mode = generate_learning_path(topic, level, duration)

        s.learning_path = json.dumps(plan)
        s.learning_path_mode = mode
        s.learning_path_generated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(s)
        return jsonify({"learning_path": _serialize_learning_path(s)}), 201
    finally:
        db.close()

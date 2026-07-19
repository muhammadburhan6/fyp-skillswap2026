import json
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.models import Match, PointsTransaction, Review, Session as SwapSession, SessionLocal, Skill, User
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


def _user_name(db, user_id: int) -> str:
    person = db.get(User, user_id)
    return person.name if person else ""


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
        session_ids = [s.id for s in rows]
        reviewed_ids = set()
        if session_ids:
            reviewed_ids = {
                r.session_id
                for r in db.query(Review.session_id)
                .filter(Review.session_id.in_(session_ids), Review.reviewer_id == user.id)
                .all()
            }
        my_ratings = {}
        if reviewed_ids:
            for r in db.query(Review).filter(
                Review.session_id.in_(reviewed_ids), Review.reviewer_id == user.id
            ).all():
                my_ratings[r.session_id] = r.rating

        return jsonify({
            "sessions": [
                {
                    "id": s.id,
                    "teacher_id": s.teacher_id,
                    "teacher_name": _user_name(db, s.teacher_id),
                    "learner_id": s.learner_id,
                    "learner_name": _user_name(db, s.learner_id),
                    "skill_id": s.skill_id,
                    "skill": _session_skill_name(db, s),
                    "scheduled_at": s.scheduled_at.isoformat(),
                    "status": s.status,
                    "points_cost": s.points_cost,
                    "meeting_link": s.meeting_link,
                    "has_learning_path": bool(s.learning_path),
                    "session_type": getattr(s, "session_type", "swap") or "swap",
                    "reviewed_by_me": s.id in reviewed_ids,
                    "my_rating": my_ratings.get(s.id),
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
    cost = 10
    db = SessionLocal()
    try:
        u = db.query(User).get(user.id)
        teacher_id = int(data.get("teacher_id") or 0)
        if not teacher_id or teacher_id == user.id:
            return jsonify({"error": "Choose a valid teaching partner"}), 400

        accepted_match = db.query(Match).filter(
            Match.status == "accepted",
            (
                ((Match.user_a_id == user.id) & (Match.user_b_id == teacher_id))
                | ((Match.user_a_id == teacher_id) & (Match.user_b_id == user.id))
            ),
        ).first()
        if not accepted_match:
            return jsonify({"error": "You can only book swap sessions with accepted matches"}), 403

        if u.points_balance < cost:
            return jsonify({"error": "Insufficient points"}), 400

        skill_id = data.get("skill_id")
        if not skill_id and data.get("skill"):
            skill = db.query(Skill).filter_by(name=data["skill"]).first()
            skill_id = skill.id if skill else None
        skill = db.query(Skill).get(int(skill_id)) if skill_id else None
        teacher = db.query(User).get(teacher_id)
        if not teacher or not skill or skill not in teacher.skills_teach:
            return jsonify({"error": "Choose a skill this partner teaches"}), 400

        try:
            scheduled_at = datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "Choose a valid date and time"}), 400

        u.points_balance -= cost
        db.add(PointsTransaction(user_id=u.id, amount=-cost, reason="session_booking"))

        session = SwapSession(
            teacher_id=teacher_id,
            learner_id=user.id,
            skill_id=skill_id,
            scheduled_at=scheduled_at,
            status="scheduled",
            points_cost=cost,
            meeting_link="",
            session_type="swap",
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
        if user.id not in (s.teacher_id, s.learner_id):
            return jsonify({"error": "Forbidden"}), 403
        if "status" in data:
            if data["status"] != "completed":
                return jsonify({"error": "Invalid session status"}), 400
            if user.id != s.teacher_id:
                return jsonify({"error": "Only the teacher can complete a session"}), 403
            if s.status == "completed":
                return jsonify({"session": {"id": s.id, "status": s.status}})
            s.status = "completed"
            if s.teacher_id:
                # Only award SP for skill-swap sessions; paid sessions earn real money instead.
                is_swap = (getattr(s, "session_type", "swap") or "swap") == "swap"
                db.flush()
                teacher = db.query(User).get(s.teacher_id)
                if is_swap:
                    teacher.points_balance += 15
                    db.add(PointsTransaction(user_id=teacher.id, amount=15, reason="teach_session", session_id=s.id))
                award_xp(db, teacher, 25)
                check_and_award_badges(db, teacher.id)

                if s.learner_id and s.learner_id != s.teacher_id:
                    learner = db.query(User).get(s.learner_id)
                    if learner:
                        award_xp(db, learner, 15)
                        check_and_award_badges(db, learner.id)
                        notify(db, learner.id, "session_completed", {"session_id": s.id})

                notify(db, teacher.id, "session_completed", {"session_id": s.id})
        if "meeting_link" in data:
            if user.id != s.teacher_id:
                return jsonify({"error": "Only the teacher can set the meeting link"}), 403
            link = (data.get("meeting_link") or "").strip()
            if link and not link.startswith(("https://", "http://")):
                return jsonify({"error": "Meeting link must start with http:// or https://"}), 400
            s.meeting_link = link
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

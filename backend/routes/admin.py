"""Admin panel API: stats, user management, dispute resolution, skill
moderation, and analytics. Every route requires an admin token."""

from collections import OrderedDict
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.models import (
    Dispute,
    Match,
    Session as SwapSession,
    SessionLocal,
    Skill,
    SkillModeration,
    User,
)
from services.notification_service import notify
from utils.auth_middleware import require_admin
from utils.serializers import user_to_dict

admin_bp = Blueprint("admin", __name__)

ACTIVE_STATUSES = ("active", "verified")


def _admin_user_dict(u):
    data = user_to_dict(u)
    data["skills"] = data.get("skills_teach", [])
    data["created_at"] = u.created_at.isoformat() if u.created_at else None
    return data


@admin_bp.route("/stats", methods=["GET"])
@require_admin
def stats(admin):
    db = SessionLocal()
    try:
        return jsonify({
            "total_users": db.query(User).count(),
            "active_users": db.query(User).filter(User.status.in_(ACTIVE_STATUSES)).count(),
            "suspended_users": db.query(User).filter(User.status.in_(["suspended", "banned"])).count(),
            "open_disputes": db.query(Dispute).filter_by(status="open").count(),
            "pending_skills": db.query(SkillModeration).filter_by(status="pending").count(),
            "total_sessions": db.query(SwapSession).count(),
            "completed_sessions": db.query(SwapSession).filter_by(status="completed").count(),
            "platform_health": "healthy",
        })
    finally:
        db.close()


# ------------------------------------------------------------------ users

@admin_bp.route("/users", methods=["GET"])
@require_admin
def all_users(admin):
    q = (request.args.get("q") or "").strip().lower()
    db = SessionLocal()
    try:
        query = db.query(User)
        if q:
            query = query.filter(
                (User.name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%"))
            )
        users = query.order_by(User.created_at.desc()).all()
        return jsonify({"users": [_admin_user_dict(u) for u in users]})
    finally:
        db.close()


@admin_bp.route("/users/<int:user_id>/status", methods=["PATCH"])
@require_admin
def update_user_status(admin, user_id):
    data = request.get_json() or {}
    status = data.get("status")
    if status not in ("active", "verified", "suspended", "banned"):
        return jsonify({"error": "Invalid status"}), 400
    if user_id == admin.id:
        return jsonify({"error": "You cannot change your own status"}), 400

    db = SessionLocal()
    try:
        target = db.get(User, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        if target.role == "admin":
            return jsonify({"error": "Admin accounts cannot be modified"}), 403
        target.status = status
        if status in ("suspended", "banned"):
            notify(db, target.id, "account_warning", {"status": status})
        db.commit()
        db.refresh(target)
        return jsonify({"user": _admin_user_dict(target)})
    finally:
        db.close()


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(admin, user_id):
    """Remove a user and their activity records. Requires confirm: DELETE."""
    data = request.get_json(silent=True) or {}
    if data.get("confirm") != "DELETE":
        return jsonify({"error": "Type DELETE to confirm account deletion"}), 400
    if user_id == admin.id:
        return jsonify({"error": "You cannot delete your own admin account"}), 400

    db = SessionLocal()
    try:
        target = db.get(User, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        if target.role == "admin":
            return jsonify({"error": "Admin accounts cannot be deleted"}), 403

        from database.models import (
            Message,
            Notification,
            PointsTransaction,
            Review,
            UserBadge,
        )

        db.query(PointsTransaction).filter_by(user_id=user_id).delete(synchronize_session=False)
        db.query(Notification).filter_by(user_id=user_id).delete(synchronize_session=False)
        db.query(UserBadge).filter_by(user_id=user_id).delete(synchronize_session=False)
        db.query(Review).filter(
            (Review.reviewer_id == user_id) | (Review.reviewee_id == user_id)
        ).delete(synchronize_session=False)
        db.query(SwapSession).filter(
            (SwapSession.teacher_id == user_id) | (SwapSession.learner_id == user_id)
        ).delete(synchronize_session=False)
        db.query(Match).filter(
            (Match.user_a_id == user_id) | (Match.user_b_id == user_id)
        ).delete(synchronize_session=False)
        db.query(Message).filter_by(sender_id=user_id).delete(synchronize_session=False)
        db.query(Dispute).filter(
            (Dispute.reporter_id == user_id) | (Dispute.accused_id == user_id)
        ).delete(synchronize_session=False)
        db.query(SkillModeration).filter_by(user_id=user_id).delete(synchronize_session=False)

        target.skills_teach.clear()
        target.skills_learn.clear()
        target.conversations.clear()
        db.delete(target)
        db.commit()
        return jsonify({"message": f"User {user_id} deleted"})
    finally:
        db.close()


@admin_bp.route("/tokens/distribute", methods=["POST"])
@require_admin
def distribute(admin):
    data = request.get_json() or {}
    amount = int(data.get("amount", 100))
    db = SessionLocal()
    try:
        for u in db.query(User).all():
            u.points_balance += amount
            notify(db, u.id, "points_granted", {"amount": amount})
        db.commit()
        return jsonify({"message": f"Distributed {amount} points to all users"})
    finally:
        db.close()


# --------------------------------------------------------------- disputes

def _dispute_dict(db, d):
    reporter = db.get(User, d.reporter_id)
    accused = db.get(User, d.accused_id)
    return {
        "id": d.id,
        "user_a": {"id": d.reporter_id, "name": reporter.name if reporter else "Unknown"},
        "user_b": {"id": d.accused_id, "name": accused.name if accused else "Unknown"},
        "skill": d.skill_name,
        "complaint": d.complaint,
        "status": d.status,
        "admin_notes": d.admin_notes,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@admin_bp.route("/disputes", methods=["GET"])
@require_admin
def list_disputes(admin):
    db = SessionLocal()
    try:
        disputes = db.query(Dispute).order_by(Dispute.created_at.desc()).all()
        return jsonify({"disputes": [_dispute_dict(db, d) for d in disputes]})
    finally:
        db.close()


@admin_bp.route("/disputes/<int:dispute_id>", methods=["PATCH"])
@require_admin
def update_dispute(admin, dispute_id):
    data = request.get_json() or {}
    action = data.get("action")
    if action not in ("warn", "ban", "resolve"):
        return jsonify({"error": "Invalid action"}), 400

    db = SessionLocal()
    try:
        dispute = db.get(Dispute, dispute_id)
        if not dispute:
            return jsonify({"error": "Dispute not found"}), 404

        now = datetime.now(timezone.utc)
        if action == "warn":
            dispute.status = "warned"
            dispute.admin_notes = data.get("note", "Warning issued by admin")
            notify(db, dispute.accused_id, "account_warning", {"dispute_id": dispute.id})
        elif action == "ban":
            dispute.status = "banned"
            dispute.resolved_at = now
            dispute.admin_notes = data.get("note", "User banned after dispute review")
            accused = db.get(User, dispute.accused_id)
            if accused and accused.role != "admin":
                accused.status = "banned"
        else:  # resolve
            dispute.status = "resolved"
            dispute.resolved_at = now
            dispute.admin_notes = data.get("note", "Resolved by admin")

        db.commit()
        return jsonify({"dispute": _dispute_dict(db, dispute)})
    finally:
        db.close()


# ------------------------------------------------------------- moderation

def _moderation_dict(db, item):
    submitter = db.get(User, item.user_id)
    return {
        "id": item.id,
        "skill_name": item.skill_name,
        "category": item.category,
        "status": item.status,
        "reason": item.reason,
        "flagged": bool(item.flagged),
        "user": {"id": item.user_id, "name": submitter.name if submitter else "Unknown"},
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@admin_bp.route("/moderation", methods=["GET"])
@require_admin
def moderation_queue(admin):
    db = SessionLocal()
    try:
        items = db.query(SkillModeration).order_by(SkillModeration.created_at.desc()).all()
        return jsonify({"items": [_moderation_dict(db, i) for i in items]})
    finally:
        db.close()


@admin_bp.route("/moderation/<int:item_id>", methods=["PATCH"])
@require_admin
def moderate_skill(admin, item_id):
    data = request.get_json() or {}
    action = data.get("action")
    if action not in ("approve", "reject", "remove", "shadowban"):
        return jsonify({"error": "Invalid action"}), 400

    db = SessionLocal()
    try:
        item = db.get(SkillModeration, item_id)
        if not item:
            return jsonify({"error": "Moderation item not found"}), 404

        if action == "approve":
            item.status = "approved"
            existing = db.query(Skill).filter(Skill.name.ilike(item.skill_name)).first()
            if not existing:
                db.add(Skill(name=item.skill_name, category=item.category, moderation_status="approved"))
            else:
                existing.moderation_status = "approved"
        elif action == "reject":
            reason = (data.get("reason") or "").strip()
            if not reason:
                return jsonify({"error": "Rejection reason is required"}), 400
            item.status = "rejected"
            item.reason = reason
        elif action == "remove":
            item.status = "removed"
            item.reason = data.get("reason", "Inappropriate content removed")
            existing = db.query(Skill).filter(Skill.name.ilike(item.skill_name)).first()
            if existing:
                existing.moderation_status = "rejected"
        else:  # shadowban
            item.status = "shadowbanned"
            submitter = db.get(User, item.user_id)
            if submitter and submitter.role != "admin":
                submitter.status = "suspended"

        db.commit()
        return jsonify({"item": _moderation_dict(db, item)})
    finally:
        db.close()


# -------------------------------------------------------------- analytics

@admin_bp.route("/analytics", methods=["GET"])
@require_admin
def analytics(admin):
    db = SessionLocal()
    try:
        from services.skill_demand_service import analyze_skill_demand

        demand_data = analyze_skill_demand(db, limit=6)
        demand = [
            {"skill": s["name"], "count": s["learners"]}
            for s in demand_data.get("skills", [])
        ]

        active = db.query(User).filter(User.status.in_(ACTIVE_STATUSES)).count()
        suspended = db.query(User).filter_by(status="suspended").count()
        banned = db.query(User).filter_by(status="banned").count()
        users_pie = [
            {"label": "Active", "value": active},
            {"label": "Suspended", "value": suspended},
            {"label": "Banned", "value": banned},
        ]

        completed = db.query(SwapSession).filter_by(status="completed").count()
        total_disputes = db.query(Dispute).count()
        swaps_vs_disputes = [
            {"label": "Completed swaps", "value": completed},
            {"label": "Disputes", "value": total_disputes},
        ]

        # Last 6 calendar months of sessions vs disputes.
        def month_key(dt):
            return dt.strftime("%b")

        now = datetime.now(timezone.utc)
        months = OrderedDict()
        for offset in range(5, -1, -1):
            year = now.year
            month = now.month - offset
            while month <= 0:
                month += 12
                year -= 1
            months[(year, month)] = {"month": datetime(year, month, 1).strftime("%b"), "swaps": 0, "disputes": 0}

        for (created_at,) in db.query(SwapSession.created_at).all():
            if created_at and (created_at.year, created_at.month) in months:
                months[(created_at.year, created_at.month)]["swaps"] += 1
        for (created_at,) in db.query(Dispute.created_at).all():
            if created_at and (created_at.year, created_at.month) in months:
                months[(created_at.year, created_at.month)]["disputes"] += 1

        return jsonify({
            "demand": demand,
            "users_pie": users_pie,
            "swaps_vs_disputes": swaps_vs_disputes,
            "timeline": list(months.values()),
        })
    finally:
        db.close()

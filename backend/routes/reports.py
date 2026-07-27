"""User reports API for reporting inappropriate accounts/spam."""

from flask import Blueprint, jsonify, request

from database.models import Report, SessionLocal, User
from utils.auth_middleware import require_auth

reports_bp = Blueprint("reports", __name__)

VALID_REASONS = {"spam", "harassment", "scam", "inappropriate", "other"}


@reports_bp.route("", methods=["POST"])
@reports_bp.route("/", methods=["POST"])
@require_auth
def create_report(user):
    data = request.get_json() or {}
    reported_user_id = data.get("reported_user_id")
    reason = (data.get("reason") or "").strip().lower()
    details = (data.get("details") or "").strip()

    if not reported_user_id or not reason:
        return jsonify({"error": "reported_user_id and reason are required"}), 400

    try:
        reported_user_id = int(reported_user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid reported_user_id"}), 400

    if user.id == reported_user_id:
        return jsonify({"error": "You cannot report yourself"}), 400

    if reason not in VALID_REASONS:
        return jsonify({"error": f"Invalid reason. Must be one of: {', '.join(sorted(VALID_REASONS))}"}), 400

    db = SessionLocal()
    try:
        target_user = db.get(User, reported_user_id)
        if not target_user:
            return jsonify({"error": "Reported user not found"}), 404

        existing = (
            db.query(Report)
            .filter_by(reporter_id=user.id, reported_user_id=reported_user_id, status="open")
            .first()
        )
        if existing:
            return jsonify({"error": "You already have an open report for this user"}), 409

        report = Report(
            reporter_id=user.id,
            reported_user_id=reported_user_id,
            reason=reason,
            details=details,
            status="open",
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        return jsonify({
            "report": {
                "id": report.id,
                "reporter_id": report.reporter_id,
                "reported_user_id": report.reported_user_id,
                "reason": report.reason,
                "details": report.details,
                "status": report.status,
                "created_at": report.created_at.isoformat() if report.created_at else None,
            }
        }), 201
    finally:
        db.close()

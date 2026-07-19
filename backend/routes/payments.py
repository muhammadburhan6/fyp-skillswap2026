"""Paid sessions via Stripe Checkout — pricing CRUD, checkout, webhook, earnings."""

from __future__ import annotations

import math
from datetime import datetime, timezone

import stripe
from flask import Blueprint, jsonify, request

from config import Config
from database.models import (
    PaymentRecord,
    Session as SwapSession,
    SessionLocal,
    Skill,
    SkillPricing,
    User,
)
from services.notification_service import notify
from utils.auth_middleware import require_auth

payments_bp = Blueprint("payments", __name__)

stripe.api_key = Config.STRIPE_SECRET_KEY


def _now():
    return datetime.now(timezone.utc)


def _skill_by_name(db, name: str):
    return db.query(Skill).filter_by(name=name).first()


def _pricing_dict(p: SkillPricing, skill_name: str = "") -> dict:
    return {
        "id": p.id,
        "skill_id": p.skill_id,
        "skill": skill_name,
        "price_usd": p.price_usd,
        "currency": p.currency,
        "is_active": p.is_active,
    }


# ---------------------------------------------------------------------------
# Pricing CRUD
# ---------------------------------------------------------------------------

@payments_bp.route("/pricing/<int:user_id>", methods=["GET"])
def get_teacher_pricing(user_id):
    """Public — returns a teacher's active per-skill prices."""
    db = SessionLocal()
    try:
        rows = (
            db.query(SkillPricing)
            .filter_by(user_id=user_id, is_active=True)
            .all()
        )
        result = []
        for p in rows:
            skill = db.query(Skill).get(p.skill_id)
            result.append(_pricing_dict(p, skill.name if skill else ""))
        return jsonify({"pricing": result})
    finally:
        db.close()


@payments_bp.route("/pricing", methods=["PUT"])
@require_auth
def set_my_pricing(user):
    """Upsert a price for one of my teach skills. Body: {skill or skill_id, price_usd}."""
    data = request.get_json() or {}
    skill_name = (data.get("skill") or "").strip()
    skill_id = data.get("skill_id")
    price_usd = data.get("price_usd")

    if price_usd is None:
        return jsonify({"error": "price_usd is required"}), 400
    try:
        price_usd = float(price_usd)
    except (TypeError, ValueError):
        return jsonify({"error": "price_usd must be a number"}), 400
    if price_usd < 1:
        return jsonify({"error": "Minimum price is $1.00"}), 400
    if price_usd > 9999:
        return jsonify({"error": "Maximum price is $9,999.00"}), 400

    db = SessionLocal()
    try:
        skill = None
        if skill_id:
            skill = db.query(Skill).get(int(skill_id))
        elif skill_name:
            skill = _skill_by_name(db, skill_name)
        if not skill:
            return jsonify({"error": "Skill not found"}), 404

        # Verify user teaches this skill
        teacher = db.query(User).get(user.id)
        teaches = [s.name for s in teacher.skills_teach]
        if skill.name not in teaches:
            return jsonify({"error": "You can only set prices for skills you teach"}), 403

        existing = (
            db.query(SkillPricing)
            .filter_by(user_id=user.id, skill_id=skill.id)
            .first()
        )
        if existing:
            existing.price_usd = round(price_usd, 2)
            existing.is_active = True
            existing.updated_at = _now()
            pricing = existing
        else:
            pricing = SkillPricing(
                user_id=user.id,
                skill_id=skill.id,
                price_usd=round(price_usd, 2),
            )
            db.add(pricing)

        db.commit()
        db.refresh(pricing)
        return jsonify({"pricing": _pricing_dict(pricing, skill.name)})
    finally:
        db.close()


@payments_bp.route("/pricing/<int:skill_id>", methods=["DELETE"])
@require_auth
def delete_my_pricing(user, skill_id):
    """Deactivate my price for a skill (learners can no longer book paid sessions)."""
    db = SessionLocal()
    try:
        pricing = (
            db.query(SkillPricing)
            .filter_by(user_id=user.id, skill_id=skill_id)
            .first()
        )
        if not pricing:
            return jsonify({"error": "Not found"}), 404
        pricing.is_active = False
        pricing.updated_at = _now()
        db.commit()
        return jsonify({"message": "Price removed"})
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Stripe Checkout
# ---------------------------------------------------------------------------

@payments_bp.route("/checkout", methods=["POST"])
@require_auth
def create_checkout(user):
    """Create a Stripe Checkout Session for a paid booking."""
    if not Config.STRIPE_SECRET_KEY:
        return jsonify({"error": "Payments are not configured on this server"}), 503

    data = request.get_json() or {}
    teacher_id = data.get("teacher_id")
    skill_id = data.get("skill_id")
    skill_name = (data.get("skill") or "").strip()
    scheduled_at_str = data.get("scheduled_at")

    if not teacher_id:
        return jsonify({"error": "teacher_id is required"}), 400
    if not scheduled_at_str:
        return jsonify({"error": "scheduled_at is required"}), 400
    if user.id == int(teacher_id):
        return jsonify({"error": "You cannot book a session with yourself"}), 400

    db = SessionLocal()
    try:
        teacher = db.query(User).get(int(teacher_id))
        if not teacher:
            return jsonify({"error": "Teacher not found"}), 404

        # Resolve skill
        skill = None
        if skill_id:
            skill = db.query(Skill).get(int(skill_id))
        elif skill_name:
            skill = _skill_by_name(db, skill_name)
        if not skill:
            return jsonify({"error": "Skill not found"}), 404

        # Look up price
        pricing = (
            db.query(SkillPricing)
            .filter_by(user_id=int(teacher_id), skill_id=skill.id, is_active=True)
            .first()
        )
        if not pricing:
            return jsonify({"error": "This teacher has not set a price for this skill"}), 404

        try:
            scheduled_at = datetime.fromisoformat(scheduled_at_str.replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"error": "Invalid scheduled_at format"}), 400

        fee_pct = Config.PLATFORM_FEE_PERCENT
        amount_cents = int(round(pricing.price_usd * 100))
        platform_fee_cents = math.floor(amount_cents * fee_pct / 100)
        teacher_earnings_cents = amount_cents - platform_fee_cents

        frontend_url = Config.FRONTEND_URL.rstrip("/")

        # Create pending PaymentRecord first so we have an ID for Stripe metadata
        record = PaymentRecord(
            learner_id=user.id,
            teacher_id=int(teacher_id),
            skill_id=skill.id,
            scheduled_at=scheduled_at,
            amount_cents=amount_cents,
            currency="usd",
            platform_fee_cents=platform_fee_cents,
            teacher_earnings_cents=teacher_earnings_cents,
            stripe_checkout_id="pending",
            status="pending",
        )
        db.add(record)
        db.flush()

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": f"{skill.name} session with {teacher.name}",
                        "description": (
                            f"Scheduled: {scheduled_at.strftime('%b %d, %Y %H:%M UTC')} · "
                            f"Platform fee ({fee_pct}%) included"
                        ),
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{frontend_url}/calendar?payment=success",
            cancel_url=f"{frontend_url}/calendar?payment=cancel",
            metadata={
                "payment_record_id": str(record.id),
                "learner_id": str(user.id),
                "teacher_id": str(teacher_id),
                "skill_id": str(skill.id),
            },
        )

        record.stripe_checkout_id = checkout_session.id
        db.commit()

        return jsonify({"checkout_url": checkout_session.url})
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Stripe Webhook
# ---------------------------------------------------------------------------

@payments_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    """Stripe webhook — confirms payment and creates the Session row."""
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature", "")
    webhook_secret = Config.STRIPE_WEBHOOK_SECRET

    if webhook_secret and webhook_secret != "whsec_your_webhook_secret_here":
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except (stripe.error.SignatureVerificationError, ValueError):
            return jsonify({"error": "Invalid signature"}), 400
    else:
        # Dev mode: no signature validation when secret is placeholder
        import json as _json
        event = _json.loads(payload)

    # Stripe objects support dict-style indexing but not .get(); normalize to a
    # plain dict so both the signed (StripeObject) and dev (dict) paths work.
    def _to_dict(obj):
        if hasattr(obj, "to_dict_recursive"):
            return obj.to_dict_recursive()
        if hasattr(obj, "to_dict"):
            return obj.to_dict()
        return obj

    event = _to_dict(event)

    if event.get("type") == "checkout.session.completed":
        checkout_session = event["data"]["object"]
        metadata = checkout_session.get("metadata") or {}
        record_id = metadata.get("payment_record_id")

        if not record_id:
            return jsonify({"status": "ignored"}), 200

        db = SessionLocal()
        try:
            record = db.query(PaymentRecord).get(int(record_id))
            if not record or record.status == "paid":
                return jsonify({"status": "ok"}), 200

            record.status = "paid"
            record.stripe_payment_intent_id = checkout_session.get("payment_intent")
            record.updated_at = _now()

            # Resolve skill name for session
            skill = db.query(Skill).get(record.skill_id) if record.skill_id else None

            paid_session = SwapSession(
                teacher_id=record.teacher_id,
                learner_id=record.learner_id,
                skill_id=record.skill_id,
                scheduled_at=record.scheduled_at or _now(),
                status="scheduled",
                points_cost=0,
                session_type="paid",
                payment_id=record.id,
            )
            db.add(paid_session)
            db.flush()

            record.session_id = paid_session.id

            skill_name = skill.name if skill else "session"
            teacher = db.query(User).get(record.teacher_id)
            learner = db.query(User).get(record.learner_id)

            if teacher:
                notify(db, teacher.id, "paid_session_booked", {
                    "session_id": paid_session.id,
                    "learner_name": learner.name if learner else "",
                    "skill": skill_name,
                    "amount_usd": record.teacher_earnings_cents / 100,
                })
            if learner:
                notify(db, learner.id, "paid_session_confirmed", {
                    "session_id": paid_session.id,
                    "teacher_name": teacher.name if teacher else "",
                    "skill": skill_name,
                })

            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    return jsonify({"status": "ok"}), 200


# ---------------------------------------------------------------------------
# Earnings
# ---------------------------------------------------------------------------

@payments_bp.route("/earnings", methods=["GET"])
@require_auth
def my_earnings(user):
    """Returns all paid sessions where the current user is the teacher."""
    db = SessionLocal()
    try:
        records = (
            db.query(PaymentRecord)
            .filter_by(teacher_id=user.id, status="paid")
            .order_by(PaymentRecord.created_at.desc())
            .all()
        )
        total_cents = sum(r.teacher_earnings_cents for r in records)
        entries = []
        for r in records:
            skill = db.query(Skill).get(r.skill_id) if r.skill_id else None
            learner = db.query(User).get(r.learner_id)
            entries.append({
                "id": r.id,
                "session_id": r.session_id,
                "skill": skill.name if skill else "",
                "learner_name": learner.name if learner else "",
                "amount_usd": r.amount_cents / 100,
                "earnings_usd": r.teacher_earnings_cents / 100,
                "platform_fee_usd": r.platform_fee_cents / 100,
                "scheduled_at": r.scheduled_at.isoformat() if r.scheduled_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        return jsonify({
            "total_earnings_usd": total_cents / 100,
            "session_count": len(records),
            "earnings": entries,
        })
    finally:
        db.close()

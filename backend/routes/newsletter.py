import re

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from database.models import NewsletterSubscriber, SessionLocal

newsletter_bp = Blueprint("newsletter", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@newsletter_bp.route("/subscribe", methods=["POST"])
def subscribe():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email or not EMAIL_RE.match(email):
        return jsonify({"error": "Please enter a valid email address."}), 400

    db = SessionLocal()
    try:
        existing = db.query(NewsletterSubscriber).filter_by(email=email).first()
        if existing:
            return jsonify({"message": "You're already subscribed."})

        db.add(NewsletterSubscriber(email=email))
        db.commit()
        return jsonify({"message": "Thanks for subscribing!"}), 201
    except IntegrityError:
        db.rollback()
        return jsonify({"message": "You're already subscribed."})
    finally:
        db.close()

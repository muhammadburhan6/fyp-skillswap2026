import logging

from flask import Blueprint, jsonify, request

from services.openai_client import get_openai_client, is_ai_available
from utils.auth_middleware import require_auth

ai_bp = Blueprint("ai", __name__)

logger = logging.getLogger(__name__)

RESPONSES = {
    "recommend": "Based on your skills, I recommend matching with someone who teaches Video Editing or UI Design. Check the Matches page!",
    "schedule": "Head to the Exchange page to pick a date and time. Sessions cost 10 Heart Tokens.",
    "tokens": "You receive 100 Heart Tokens every day. Use them to book sessions or unlock premium AI features.",
    "default": "I'm your SkillSwap assistant! Ask me about skill recommendations, scheduling, or heart tokens.",
}


def _fallback_reply(message: str) -> str:
    if "recommend" in message or "skill" in message:
        return RESPONSES["recommend"]
    if "schedule" in message or "session" in message or "book" in message:
        return RESPONSES["schedule"]
    if "token" in message or "heart" in message:
        return RESPONSES["tokens"]
    return RESPONSES["default"]


@ai_bp.route("/chat", methods=["POST"])
@require_auth
def ai_chat(user):
    data = request.get_json() or {}
    raw_message = data.get("message", "")
    message = raw_message.lower()

    if is_ai_available():
        try:
            client = get_openai_client()
            skills = ", ".join(s.name for s in user.skills_learn) if hasattr(user, "skills_learn") else ""
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": f"You are SkillSwap AI assistant. User wants to learn: {skills}. Be concise."},
                    {"role": "user", "content": raw_message},
                ],
                max_tokens=200,
            )
            reply = resp.choices[0].message.content
            return jsonify({"reply": reply, "mode": "ai"})
        except Exception:
            # Surface the failure in server logs instead of silently degrading.
            logger.exception("OpenAI request failed; falling back to keyword responses")

    return jsonify({"reply": _fallback_reply(message), "mode": "fallback"})

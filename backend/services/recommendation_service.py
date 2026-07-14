"""AI-assisted skill-match recommendations.

Pulls algorithmic candidates first, then (when AI is available) asks OpenAI to
rank the top candidates and write a one-line reason each. Results are cached
per-user for a short window, keyed by the user's skill profile so the cache
invalidates automatically when their skills change.
"""

import json
import logging
import time

from database.models import User
from services.matching_service import skill_overlap
from services.openai_client import get_openai_client, is_ai_available

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 15 * 60
AI_CANDIDATE_LIMIT = 10

# user_id -> {"signature": str, "expires": float, "data": dict}
_cache: dict[int, dict] = {}


def _skill_signature(user) -> str:
    teach = sorted(s.name.lower() for s in user.skills_teach)
    learn = sorted(s.name.lower() for s in user.skills_learn)
    return "|".join(teach) + "::" + "|".join(learn)


def _fallback_reason(overlap: dict) -> str:
    exact = overlap["exact_count"]
    related = overlap["related_count"]
    if exact:
        return f"Shares {exact} matching skill{'s' if exact != 1 else ''}"
    if related:
        return f"Works in {related} related skill area{'s' if related != 1 else ''}"
    return "Suggested based on your profile"


def get_candidate_matches(db, user_id: int, limit: int = AI_CANDIDATE_LIMIT):
    """Algorithmic candidates sorted by overlap strength, best first."""
    user = db.get(User, user_id)
    if not user:
        return user, []

    candidates = []
    for cand in db.query(User).filter(User.id != user_id).all():
        overlap = skill_overlap(user, cand)
        total = overlap["exact_count"] + overlap["related_count"]
        if total == 0:
            continue
        candidates.append({
            "user": cand,
            "overlap": overlap,
            "shared_skills": overlap["exact"] + overlap["related"],
            # Weight exact matches higher for the base algorithmic ordering.
            "base_score": overlap["exact_count"] * 20 + overlap["related_count"] * 8,
        })

    candidates.sort(key=lambda c: c["base_score"], reverse=True)
    return user, candidates[:limit]


def _build_recommendation(cand, reason, score):
    from utils.serializers import user_to_dict

    return {
        "user": user_to_dict(cand["user"]),
        "shared_skills": cand["shared_skills"],
        "reason": reason,
        "score": score,
    }


def _fallback_recommendations(candidates):
    recs = []
    for cand in candidates:
        # Map the algorithmic base_score into a friendly 0-100 range.
        score = min(98, 40 + cand["base_score"])
        recs.append(_build_recommendation(cand, _fallback_reason(cand["overlap"]), score))
    return recs


def rank_with_ai(user, candidates):
    """Ask OpenAI to rank candidates and write a reason each.

    Returns (recommendations, mode). Falls back to the algorithmic ranking on any
    failure. Never returns a user_id that wasn't in the candidate set.
    """
    if not candidates:
        return [], "fallback"

    if not is_ai_available():
        return _fallback_recommendations(candidates), "fallback"

    client = get_openai_client()
    if client is None:
        return _fallback_recommendations(candidates), "fallback"

    by_id = {c["user"].id: c for c in candidates}
    user_offered = [s.name for s in user.skills_teach]
    user_wanted = [s.name for s in user.skills_learn]

    candidate_payload = [
        {
            "user_id": c["user"].id,
            "name": c["user"].name,
            "teaches": [s.name for s in c["user"].skills_teach],
            "wants_to_learn": [s.name for s in c["user"].skills_learn],
            "shared_skills": c["shared_skills"],
        }
        for c in candidates
    ]

    system = (
        "You are SkillSwap's matching assistant. Rank candidate users as skill-swap "
        "partners for the current user. Return ONLY a JSON array, no prose. Each item: "
        '{"user_id": <int from candidates>, "reason": "<one short sentence>", "score": <0-100>}. '
        "Only use user_id values from the provided candidates."
    )
    user_prompt = json.dumps({
        "current_user": {"offers": user_offered, "wants_to_learn": user_wanted},
        "candidates": candidate_payload,
    })

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=600,
            temperature=0.4,
        )
        content = resp.choices[0].message.content.strip()
        parsed = _extract_json_array(content)
        if parsed is None:
            raise ValueError("AI response was not a JSON array")

        recs = []
        seen = set()
        for item in parsed:
            if not isinstance(item, dict):
                continue
            uid = item.get("user_id")
            # Guard: never trust an id the model invented.
            if uid not in by_id or uid in seen:
                continue
            seen.add(uid)
            reason = str(item.get("reason", "")).strip() or _fallback_reason(by_id[uid]["overlap"])
            try:
                score = int(item.get("score"))
            except (TypeError, ValueError):
                score = min(98, 40 + by_id[uid]["base_score"])
            score = max(0, min(100, score))
            recs.append(_build_recommendation(by_id[uid], reason, score))

        if not recs:
            raise ValueError("AI returned no valid candidate ids")

        recs.sort(key=lambda r: r["score"], reverse=True)
        return recs, "ai"
    except Exception:
        logger.exception("AI ranking failed; using algorithmic fallback")
        return _fallback_recommendations(candidates), "fallback"


def _extract_json_array(content: str):
    """Best-effort parse of a JSON array from the model output."""
    try:
        data = json.loads(content)
        return data if isinstance(data, list) else None
    except json.JSONDecodeError:
        pass
    start = content.find("[")
    end = content.rfind("]")
    if start != -1 and end != -1 and end > start:
        try:
            data = json.loads(content[start:end + 1])
            return data if isinstance(data, list) else None
        except json.JSONDecodeError:
            return None
    return None


def get_recommendations(db, user_id: int):
    """Cached entry point. Returns {"recommendations": [...], "mode": ...}."""
    user = db.get(User, user_id)
    if not user:
        return {"recommendations": [], "mode": "fallback"}

    signature = _skill_signature(user)
    now = time.time()
    cached = _cache.get(user_id)
    if cached and cached["signature"] == signature and cached["expires"] > now:
        return cached["data"]

    user, candidates = get_candidate_matches(db, user_id)
    recommendations, mode = rank_with_ai(user, candidates)
    data = {"recommendations": recommendations, "mode": mode}

    _cache[user_id] = {"signature": signature, "expires": now + CACHE_TTL_SECONDS, "data": data}
    return data


def invalidate_cache(user_id: int):
    _cache.pop(user_id, None)

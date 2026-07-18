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
    if overlap.get("is_reciprocal"):
        return "Perfect swap — you teach what they want and learn what they teach"
    exact = overlap["exact_count"]
    related = overlap["related_count"]
    if exact:
        return f"Shares {exact} matching skill{'s' if exact != 1 else ''}"
    if related:
        return f"Works in {related} related skill area{'s' if related != 1 else ''}"
    return "Suggested based on your profile"


def get_candidate_matches(db, user_id: int, limit: int = AI_CANDIDATE_LIMIT):
    """Algorithmic candidates sorted by overlap strength, best first."""
    from sqlalchemy.orm import joinedload

    user = (
        db.query(User)
        .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        return user, []

    candidates = []
    for cand in (
        db.query(User)
        .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
        .filter(User.id != user_id)
        .all()
    ):
        overlap = skill_overlap(user, cand)
        total = overlap["exact_count"] + overlap["related_count"]
        if total == 0:
            continue
        # Reciprocal swaps rank above one-sided matches.
        reciprocal_boost = 40 if overlap.get("is_reciprocal") else 0
        candidates.append({
            "user": cand,
            "overlap": overlap,
            "shared_skills": overlap["exact"] + overlap["related"],
            "base_score": overlap["exact_count"] * 20 + overlap["related_count"] * 8 + reciprocal_boost,
            "is_reciprocal": overlap.get("is_reciprocal", False),
        })

    candidates.sort(key=lambda c: (c["is_reciprocal"], c["base_score"]), reverse=True)
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
    """Rank candidates with AI (preferring Anthropic Claude if available, then OpenAI).

    Falls back to algorithmic ranking on failure.
    """
    if not candidates:
        return [], "fallback"

    from services.anthropic_client import is_anthropic_available, call_anthropic, parse_json_safely
    from services.prompts import SKILL_MATCHING_SYSTEM_PROMPT

    by_id = {str(c["user"].id): c for c in candidates}

    if is_anthropic_available():
        # Build payload for Anthropic
        def get_proficiency_level(u, is_teaching=True):
            if is_teaching:
                return "advanced" if u.level >= 5 else "intermediate"
            else:
                return "beginner"

        user_payload = {
            "id": str(user.id),
            "name": user.name,
            "skills_offered": [{"name": s.name, "level": get_proficiency_level(user, True)} for s in user.skills_teach],
            "skills_wanted": [{"name": s.name, "level": get_proficiency_level(user, False)} for s in user.skills_learn]
        }

        candidate_payload = [
            {
                "candidate_id": str(c["user"].id),
                "name": c["user"].name,
                "skills_offered": [{"name": s.name, "level": get_proficiency_level(c["user"], True)} for s in c["user"].skills_teach],
                "skills_wanted": [{"name": s.name, "level": get_proficiency_level(c["user"], False)} for s in c["user"].skills_learn]
            }
            for c in candidates
        ]

        user_prompt = json.dumps({
            "user": user_payload,
            "candidates": candidate_payload
        })

        try:
            content = call_anthropic(
                system=SKILL_MATCHING_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
                model="claude-sonnet-4-6",
                max_tokens=1000,
            )
            parsed = parse_json_safely(content)
            if not isinstance(parsed, dict) or "matches" not in parsed:
                raise ValueError("Anthropic response is not a JSON object with matches key")

            matches = parsed["matches"]
            if not isinstance(matches, list):
                raise ValueError("matches must be a list")

            recs = []
            seen = set()
            for match in matches:
                if not isinstance(match, dict):
                    continue
                cid = str(match.get("candidate_id"))
                if cid not in by_id or cid in seen:
                    continue
                seen.add(cid)

                cand = by_id[cid]
                reason = str(match.get("reasoning", "")).strip() or _fallback_reason(cand["overlap"])
                try:
                    score = int(match.get("match_score"))
                except (TypeError, ValueError):
                    score = min(98, 40 + cand["base_score"])
                score = max(0, min(100, score))

                # Combine shared skills
                shared = []
                shared_dict = match.get("shared_skills", {})
                if isinstance(shared_dict, dict):
                    they_teach = shared_dict.get("they_teach_you")
                    you_teach = shared_dict.get("you_teach_them")
                    if isinstance(they_teach, list):
                        shared.extend(they_teach)
                    if isinstance(you_teach, list):
                        shared.extend(you_teach)

                if not shared:
                    shared = cand["shared_skills"]

                recs.append({
                    "user": cand["user"],
                    "shared_skills": shared,
                    "reason": reason,
                    "score": score
                })

            if not recs:
                raise ValueError("Anthropic returned no valid candidate ids")

            # Map the user objects to dicts for output
            from utils.serializers import user_to_dict
            final_recs = []
            for r in recs:
                final_recs.append({
                    "user": user_to_dict(r["user"]),
                    "shared_skills": r["shared_skills"],
                    "reason": r["reason"],
                    "score": r["score"],
                })

            final_recs.sort(key=lambda r: r["score"], reverse=True)
            return final_recs, "ai"
        except Exception:
            logger.exception("Anthropic matching failed; falling back to OpenAI/algorithmic")

    # OpenAI Fallback
    if is_ai_available():
        client = get_openai_client()
        if client is not None:
            by_id_int = {c["user"].id: c for c in candidates}
            user_offered = [s.name for s in user.skills_teach]
            user_wanted = [s.name for s in user.skills_learn]

            openai_candidates = [
                {
                    "user_id": c["user"].id,
                    "name": c["user"].name,
                    "teaches": [s.name for s in c["user"].skills_teach],
                    "wants_to_learn": [s.name for s in c["user"].skills_learn],
                    "shared_skills": c["shared_skills"],
                }
                for c in candidates
            ]

            openai_system = (
                "You are SkillSwap's matching assistant. Rank candidate users as skill-swap "
                "partners for the current user. Prefer RECIPROCAL matches where each person "
                "teaches what the other wants to learn. Return ONLY a JSON array, no prose. Each item: "
                '{"user_id": <int from candidates>, "reason": "<one short sentence>", "score": <0-100>}. '
                "Only use user_id values from the provided candidates. Give reciprocal swaps the highest scores."
            )
            openai_prompt = json.dumps({
                "current_user": {"offers": user_offered, "wants_to_learn": user_wanted},
                "candidates": openai_candidates,
            })

            try:
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": openai_system},
                        {"role": "user", "content": openai_prompt},
                    ],
                    max_tokens=600,
                    temperature=0.4,
                )
                content = resp.choices[0].message.content.strip()
                parsed = _extract_json_array(content)
                if parsed is not None:
                    recs = []
                    seen = set()
                    for item in parsed:
                        if not isinstance(item, dict):
                            continue
                        uid = item.get("user_id")
                        if uid not in by_id_int or uid in seen:
                            continue
                        seen.add(uid)
                        reason = str(item.get("reason", "")).strip() or _fallback_reason(by_id_int[uid]["overlap"])
                        try:
                            score = int(item.get("score"))
                        except (TypeError, ValueError):
                            score = min(98, 40 + by_id_int[uid]["base_score"])
                        score = max(0, min(100, score))
                        recs.append(_build_recommendation(by_id_int[uid], reason, score))

                    if recs:
                        recs.sort(key=lambda r: r["score"], reverse=True)
                        return recs, "ai"
            except Exception:
                logger.exception("OpenAI ranking fallback failed")

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


def invalidate_cache(user_id: int = None):
    """Drop cached recommendations. If user_id is None, clear the whole cache."""
    if user_id is None:
        _cache.clear()
    else:
        _cache.pop(user_id, None)
        # Skill changes affect everyone else's candidate pool too.
        _cache.clear()


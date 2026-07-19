"""AI-generated (with templated fallback) learning paths for sessions."""

import json
import logging

from services.openai_client import get_openai_client, is_ai_available

logger = logging.getLogger(__name__)

VALID_LEVELS = {"beginner", "intermediate", "advanced"}
DEFAULT_DURATION = 60
DURATION_TOLERANCE = 0.20  # steps must sum to within ±20% of requested duration


def normalize_level(level) -> str:
    level = (level or "beginner").strip().lower()
    return level if level in VALID_LEVELS else "beginner"


def normalize_duration(duration) -> int:
    try:
        duration = int(duration)
    except (TypeError, ValueError):
        return DEFAULT_DURATION
    return max(15, min(480, duration))


def _steps_duration(steps) -> int:
    total = 0
    for s in steps:
        try:
            total += int(s.get("duration_minutes", 0))
        except (TypeError, ValueError):
            continue
    return total


def _duration_ok(steps, target) -> bool:
    total = _steps_duration(steps)
    if total <= 0:
        return False
    return abs(total - target) <= target * DURATION_TOLERANCE


def fallback_plan(topic: str, level: str, duration: int) -> dict:
    """Generic templated plan scaled to the requested duration."""
    intro = max(5, round(duration * 0.15))
    qa = max(5, round(duration * 0.15))
    remaining = max(10, duration - intro - qa)
    core = round(remaining * 0.55)
    practice = remaining - core

    steps = [
        {"title": "Introduction & goals", "description": f"Overview of {topic} and what you'll achieve.", "duration_minutes": intro},
        {"title": "Core concepts", "description": f"Key {level}-level concepts of {topic}.", "duration_minutes": core},
        {"title": "Hands-on practice", "description": f"Work through practical {topic} exercises together.", "duration_minutes": practice},
        {"title": "Q&A & next steps", "description": "Answer questions and outline what to practice next.", "duration_minutes": qa},
    ]
    return {
        "steps": steps,
        "resources": [
            f"Official {topic} documentation or beginner guide",
            f"A practice project to apply {topic}",
        ],
    }


def _extract_json_object(content: str):
    try:
        data = json.loads(content)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        pass
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            data = json.loads(content[start:end + 1])
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _valid_plan(plan) -> bool:
    if not isinstance(plan, dict):
        return False
    steps = plan.get("steps")
    if not isinstance(steps, list) or not steps:
        return False
    for s in steps:
        if not isinstance(s, dict) or "title" not in s:
            return False
    return True


def _plan_system_prompt(duration: int) -> str:
    return (
        "You are a curriculum designer for peer skill-swap sessions. Produce a structured "
        "learning plan as JSON only, no prose. Shape: "
        '{"steps": [{"title": "...", "description": "...", "duration_minutes": <int>}], '
        '"resources": ["..."]}. '
        f"The step durations MUST sum to approximately {duration} minutes."
    )


def _plan_user_prompt(topic, level, duration) -> str:
    return json.dumps({"topic": topic, "level": level, "total_duration_minutes": duration})


def _ai_request(client, topic, level, duration):
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _plan_system_prompt(duration)},
            {"role": "user", "content": _plan_user_prompt(topic, level, duration)},
        ],
        max_tokens=700,
        temperature=0.5,
    )
    return _extract_json_object(resp.choices[0].message.content.strip())


def _gemini_request(topic, level, duration):
    from services.gemini_client import call_gemini

    content = call_gemini(
        system=_plan_system_prompt(duration),
        messages=[{"role": "user", "content": _plan_user_prompt(topic, level, duration)}],
        max_tokens=900,
    )
    return _extract_json_object(content)


def generate_learning_path(topic: str, level: str, duration: int) -> tuple[dict, str]:
    """Return (plan, mode). Falls back to a template on any failure/invalid output."""
    topic = topic or "this skill"
    level = normalize_level(level)
    duration = normalize_duration(duration)

    providers = []
    if is_ai_available():
        client = get_openai_client()
        if client is not None:
            providers.append(("openai", lambda: _ai_request(client, topic, level, duration)))
    try:
        from services.gemini_client import is_gemini_available

        if is_gemini_available():
            providers.append(("gemini", lambda: _gemini_request(topic, level, duration)))
    except Exception:
        logger.exception("Gemini client unavailable for learning paths")

    for name, request_fn in providers:
        try:
            # Try once, then retry once if the durations are wildly off.
            for attempt in range(2):
                plan = request_fn()
                if _valid_plan(plan) and _duration_ok(plan["steps"], duration):
                    plan.setdefault("resources", [])
                    return plan, "ai"
                logger.info(
                    "%s learning path attempt %d rejected (duration/shape); retrying",
                    name, attempt + 1,
                )
            logger.warning("%s learning path failed validation twice", name)
        except Exception:
            logger.exception("%s learning path generation failed", name)

    return fallback_plan(topic, level, duration), "fallback"

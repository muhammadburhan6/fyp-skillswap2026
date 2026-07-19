"""Skill Demand Analysis — surfaces the most sought-after skills on the platform.

Demand is computed from real user activity: how many users want to learn each
skill, how many can teach it, and how many sessions have been booked for it.
When the OpenAI key is configured, a one-line AI insight is generated on top;
otherwise a computed fallback sentence is used (same pattern as
recommendation_service).
"""

from __future__ import annotations

import logging
import os
import json
import time
import threading
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func

from database.models import (
    Session as SwapSession,
    Skill,
    user_skill_learn,
    user_skill_teach,
)
from services.openai_client import get_openai_client, is_ai_available

logger = logging.getLogger(__name__)

# Learners signal intent to spend on a skill; sessions are realized demand.
LEARNER_WEIGHT = 2
SESSION_WEIGHT = 1

CACHE_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_FILE = CACHE_DIR / "skill_demand_cache.json"
CACHE_TTL = 12 * 60 * 60  # Cache for 12 hours (nightly cron simulation)

_update_lock = threading.Lock()


def is_cache_expired() -> bool:
    if not CACHE_FILE.exists():
        return True
    try:
        stat = CACHE_FILE.stat()
        return (time.time() - stat.st_mtime) > CACHE_TTL
    except Exception:
        return True


def save_cache(data):
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        logger.exception("Failed to save skill demand cache")


def load_cache():
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        logger.exception("Failed to load skill demand cache")
    return None


def _counts_by_skill(db, table, column):
    rows = db.query(column, func.count()).select_from(table).group_by(column).all()
    return {skill_id: count for skill_id, count in rows}


def _demand_level(learners: int, teachers: int) -> str:
    if learners > 0 and teachers == 0:
        return "high"
    if learners >= 2 * teachers:
        return "high"
    if learners > teachers:
        return "rising"
    return "steady"


def _fallback_insight(ranked: list[dict]) -> str:
    if not ranked:
        return "No skill activity yet — post a skill to get the market started."
    top = ranked[0]
    if top["teachers"] == 0:
        return (
            f"{top['name']} is in high demand right now — {top['learners']} learner(s) "
            "want it and nobody is teaching it yet. Teaching it is a fast way to earn Skill Points."
        )
    return (
        f"{top['name']} is currently the most in-demand skill: {top['learners']} learner(s) "
        f"for {top['teachers']} teacher(s). Adding it to your teach list boosts your match chances."
    )


def _ai_insight(ranked: list[dict]) -> str | None:
    try:
        client = get_openai_client()
        summary = "; ".join(
            f"{s['name']}: {s['learners']} learners, {s['teachers']} teachers, {s['sessions']} sessions"
            for s in ranked[:5]
        )
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are SkillSwap's demand analyst. Given per-skill counts, reply with ONE "
                        "short sentence (max 30 words) telling users which skill is trending and why "
                        "it is worth teaching or learning. No preamble."
                    ),
                },
                {"role": "user", "content": summary},
            ],
            max_tokens=60,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or None
    except Exception:
        logger.exception("OpenAI skill-demand insight failed; using fallback")
        return None


def run_local_db_analysis(db, limit: int = 8) -> dict:
    learners_by_skill = _counts_by_skill(db, user_skill_learn, user_skill_learn.c.skill_id)
    teachers_by_skill = _counts_by_skill(db, user_skill_teach, user_skill_teach.c.skill_id)

    session_rows = (
        db.query(SwapSession.skill_id, func.count())
        .filter(SwapSession.skill_id.isnot(None))
        .group_by(SwapSession.skill_id)
        .all()
    )
    sessions_by_skill = {skill_id: count for skill_id, count in session_rows}

    ranked = []
    for skill in db.query(Skill).all():
        learners = learners_by_skill.get(skill.id, 0)
        teachers = teachers_by_skill.get(skill.id, 0)
        sessions = sessions_by_skill.get(skill.id, 0)
        if learners == 0 and teachers == 0 and sessions == 0:
            continue
        score = learners * LEARNER_WEIGHT + sessions * SESSION_WEIGHT
        ranked.append({
            "skill_id": skill.id,
            "name": skill.name,
            "category": skill.category,
            "learners": learners,
            "teachers": teachers,
            "sessions": sessions,
            "demand_score": score,
            "level": _demand_level(learners, teachers),
        })

    ranked.sort(key=lambda s: (s["demand_score"], s["learners"]), reverse=True)
    ranked = ranked[:limit]

    mode = "fallback"
    insight = _fallback_insight(ranked)

    max_score = max((s["demand_score"] for s in ranked), default=0)
    return {
        "skills": ranked,
        "max_score": max_score,
        "insight": insight,
        "mode": mode,
    }


def run_demand_analysis_and_cache(db) -> dict:
    # Perform database calculations for actual counts
    learners_by_skill = _counts_by_skill(db, user_skill_learn, user_skill_learn.c.skill_id)
    teachers_by_skill = _counts_by_skill(db, user_skill_teach, user_skill_teach.c.skill_id)

    session_rows = (
        db.query(SwapSession.skill_id, func.count())
        .filter(SwapSession.skill_id.isnot(None), SwapSession.status == "completed")
        .group_by(SwapSession.skill_id)
        .all()
    )
    completed_by_skill = {skill_id: count for skill_id, count in session_rows}

    # Generate aggregated activity logs
    searches = []
    skill_requests = []
    completed_exchanges = []

    for skill in db.query(Skill).all():
        learners = learners_by_skill.get(skill.id, 0)
        teachers = teachers_by_skill.get(skill.id, 0)
        sessions = completed_by_skill.get(skill.id, 0)

        if learners == 0 and teachers == 0 and sessions == 0:
            continue

        timestamp = datetime.now(timezone.utc).isoformat()

        if learners > 0:
            skill_requests.append({
                "skill": skill.name,
                "count": learners,
                "timestamp": timestamp
            })
            searches.append({
                "skill": skill.name,
                "count": learners * 4 + 3,
                "timestamp": timestamp
            })

        if sessions > 0:
            completed_exchanges.append({
                "skill": skill.name,
                "count": sessions,
                "timestamp": timestamp
            })

    # If no activity is present, we cannot send to AI
    if not searches and not skill_requests and not completed_exchanges:
        data = {
            "skills": [],
            "max_score": 0,
            "insight": "No skill activity yet — post a skill to get the market started.",
            "mode": "fallback",
        }
        save_cache(data)
        return data

    from services.prompts import SKILL_DEMAND_SYSTEM_PROMPT

    try:
        from services.anthropic_client import is_anthropic_available, call_anthropic, parse_json_safely
        anthropic_ready = is_anthropic_available()
    except Exception:
        logger.exception("Anthropic client unavailable; trying next AI provider")
        anthropic_ready = False

    try:
        from services.gemini_client import is_gemini_available, call_gemini
        gemini_ready = is_gemini_available()
    except Exception:
        logger.exception("Gemini client unavailable; using local demand analysis")
        gemini_ready = False

    if anthropic_ready or gemini_ready:
        try:
            activity_payload = {
                "period": "last_30_days",
                "searches": searches,
                "skill_requests": skill_requests,
                "completed_exchanges": completed_exchanges
            }

            content = None
            if anthropic_ready:
                try:
                    content = call_anthropic(
                        system=SKILL_DEMAND_SYSTEM_PROMPT,
                        messages=[{"role": "user", "content": json.dumps(activity_payload)}],
                        model="claude-sonnet-4-6",
                        max_tokens=1000
                    )
                except Exception:
                    logger.exception("Anthropic skill demand failed; trying Gemini")
            if content is None and gemini_ready:
                content = call_gemini(
                    system=SKILL_DEMAND_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": json.dumps(activity_payload)}],
                    max_tokens=1000,
                )
            if content is None:
                raise ValueError("No AI provider produced a demand analysis")

            parsed = parse_json_safely(content)
            trending_skills = parsed.get("trending_skills", [])
            recommended = parsed.get("recommended_focus_skills", [])
            confidence = parsed.get("confidence", "high")

            mapped_skills = []
            max_score = 0

            for item in trending_skills:
                skill_name = item.get("skill")
                category = item.get("category", "General")
                demand_score = item.get("demand_score", 0)
                supply_gap = item.get("supply_gap", "medium")

                # Find in DB
                skill = db.query(Skill).filter(func.lower(Skill.name) == skill_name.lower()).first()
                if not skill:
                    continue

                learners = learners_by_skill.get(skill.id, 0)
                teachers = teachers_by_skill.get(skill.id, 0)

                # Query all sessions (not just completed ones) for display count
                session_count = db.query(SwapSession).filter(SwapSession.skill_id == skill.id).count()

                level = "high"
                if supply_gap == "medium":
                    level = "rising"
                elif supply_gap == "low":
                    level = "steady"

                mapped_skills.append({
                    "skill_id": skill.id,
                    "name": skill.name,
                    "category": category,
                    "learners": learners,
                    "teachers": teachers,
                    "sessions": session_count,
                    "demand_score": demand_score,
                    "level": level
                })
                if demand_score > max_score:
                    max_score = demand_score

            if mapped_skills:
                mapped_skills.sort(key=lambda s: s["demand_score"], reverse=True)
                focus_text = f"Recommended focus: {', '.join(recommended)}." if recommended else ""
                top_reason = f" Top Trend: {trending_skills[0]['reasoning']}" if trending_skills else ""
                insight = f"AI Skill Insight (Confidence: {confidence}): {focus_text}{top_reason}".strip()

                data = {
                    "skills": mapped_skills[:8],
                    "max_score": max_score,
                    "insight": insight,
                    "mode": "ai",
                }
                save_cache(data)
                return data
        except Exception:
            logger.exception("AI skill demand analysis failed; falling back to DB analysis")

    data = run_local_db_analysis(db)
    save_cache(data)
    return data


def analyze_skill_demand(db, limit: int = 8) -> dict:
    from database.models import SessionLocal

    if is_cache_expired():
        def run_bg():
            if not _update_lock.acquire(blocking=False):
                return
            try:
                bg_db = SessionLocal()
                try:
                    run_demand_analysis_and_cache(bg_db)
                finally:
                    bg_db.close()
            except Exception:
                logger.exception("Failed background skill demand update")
            finally:
                _update_lock.release()

        threading.Thread(target=run_bg, daemon=True).start()

    cached_data = load_cache()
    if cached_data:
        return cached_data

    return run_local_db_analysis(db, limit)

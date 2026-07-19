"""SkillBot — the in-app assistant.

Two modes, same entry point:
- With an OpenAI key: GPT answers, grounded in a live snapshot of the user's
  account (points, level, skills, matches, trending skills, sessions).
- Without a key: a data-backed intent engine answers directly from the
  database, so replies are personal and accurate instead of canned text.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from urllib.parse import quote

from database.models import Badge, Match, Notification, Session as SwapSession, Skill, User, UserBadge
from services.gamification_service import XP_PER_LEVEL
from services.matching_service import compute_match_score, discover_matches
from services.openai_client import get_openai_client, is_ai_available
from services.skill_demand_service import analyze_skill_demand

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------- data helpers

def _top_matches(db, user, limit=3):
    try:
        matches = discover_matches(db, user.id, limit=limit)
    except Exception:
        return []
    out = []
    for m in matches[:limit]:
        candidate = m.get("user")  # ORM User object
        out.append({
            "name": getattr(candidate, "name", "A user"),
            "skill": m.get("skill_offered") or "General",
            "score": round(m.get("match_score", 0)),
            "reciprocal": m.get("is_reciprocal", False),
        })
    return out


def _trending(db, limit=3):
    try:
        data = analyze_skill_demand(db, limit=limit)
        return data.get("skills", [])[:limit]
    except Exception:
        return []


def _next_session(db, user):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    s = (
        db.query(SwapSession)
        .filter(
            ((SwapSession.teacher_id == user.id) | (SwapSession.learner_id == user.id)),
            SwapSession.status == "scheduled",
        )
        .order_by(SwapSession.scheduled_at.asc())
        .first()
    )
    if not s:
        return None
    other_id = s.learner_id if s.teacher_id == user.id else s.teacher_id
    other = db.get(User, other_id)
    role = "teaching" if s.teacher_id == user.id else "learning"
    return {
        "when": s.scheduled_at.strftime("%d %b %Y, %H:%M") if s.scheduled_at else "soon",
        "partner": other.name if other else "your partner",
        "role": role,
    }


def _pending_requests(db, user):
    return db.query(Match).filter(Match.user_b_id == user.id, Match.status == "pending").count()


def _unread_notifications(db, user):
    return db.query(Notification).filter_by(user_id=user.id, read=False).count()


def _badges(db, user):
    rows = (
        db.query(Badge.name)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .filter(UserBadge.user_id == user.id)
        .all()
    )
    return [r[0] for r in rows]


# ------------------------------------------------------------- intent answers

def _greeting_reply(user):
    first = (user.name or "there").split(" ")[0]
    return (
        f"Hi {first}! 👋 I'm SkillBot. I can answer from your live account — try:\n"
        "• How many points do I have?\n"
        "• Find me a match\n"
        "• What skills are trending?\n"
        "• When is my next session?"
    )


def _points_reply(db, user):
    return (
        f"You currently have {user.points_balance} Skill Points (SP).\n"
        "• Earn +15 SP each session you teach\n"
        "• Claim +100 SP daily bonus on the Wallet page\n"
        "• Booking a session costs 10 SP"
    )


def _level_reply(user):
    to_next = XP_PER_LEVEL - ((user.xp or 0) % XP_PER_LEVEL)
    return (
        f"You are Level {user.level} with {user.xp} XP — only {to_next} XP to Level {user.level + 1}.\n"
        "Teaching a session gives +25 XP, learning gives +15 XP."
    )


def _badges_reply(db, user):
    names = _badges(db, user)
    if names:
        return (
            f"You've earned {len(names)} badge(s): {', '.join(names)}. 🏅\n"
            "Complete more sessions and collect 5-star reviews to unlock the rest — see the Progress page."
        )
    return (
        "No badges yet — complete your first session to earn the “First Swap” badge! "
        "Track them on the Progress page."
    )


def _streak_reply(user):
    if (user.streak or 0) > 0:
        return (
            f"Your streak is {user.streak} day(s) 🔥 — claim today's +100 SP bonus on the Wallet page to keep it alive."
        )
    return "No active streak. Claim the daily +100 SP bonus on the Wallet page to start one!"


def _matches_reply(db, user):
    tops = _top_matches(db, user)
    if not tops:
        return (
            "I couldn't find matches yet — add more skills you can teach and want to learn "
            "on your Profile, then check the Matches page."
        )
    lines = []
    for t in tops:
        tag = " (perfect swap!)" if t["reciprocal"] else ""
        lines.append(f"• {t['name']} — teaches {t['skill']}, {t['score']}% match{tag}")
    return (
        "Your best exchange partners right now:\n" + "\n".join(lines) +
        "\nOpen the Matches page and hit “Request →” to connect."
    )


def _trending_reply(db):
    skills = _trending(db)
    if not skills:
        return "Not enough activity to compute trends yet — check back once more skills are posted."
    lines = [
        f"• {s['name']} — {s['learners']} learner(s) vs {s['teachers']} teacher(s)"
        for s in skills
    ]
    top = skills[0]
    return (
        "Most in-demand skills right now:\n" + "\n".join(lines) +
        f"\nTip: teaching {top['name']} is a fast way to earn Skill Points."
    )


def _requests_reply(db, user):
    count = _pending_requests(db, user)
    if count:
        return (
            f"You have {count} pending exchange request(s) waiting for you. "
            "Open the Matches page — the “Incoming swap requests” panel has Accept/Decline buttons."
        )
    return "No pending exchange requests right now. Send one from the Matches page to get swapping!"


def _sessions_reply(db, user):
    nxt = _next_session(db, user)
    if nxt:
        return (
            f"Your next session: {nxt['when']} with {nxt['partner']} (you're {nxt['role']}).\n"
            "Manage it on the Calendar page."
        )
    return (
        "No upcoming sessions. Book one on the Calendar page — it costs 10 SP, "
        "and teaching earns you +15 SP and +25 XP."
    )


def _skills_reply(user):
    teach = ", ".join(s.name for s in user.skills_teach) or "none yet"
    learn = ", ".join(s.name for s in user.skills_learn) or "none yet"
    return (
        f"You teach: {teach}\nYou want to learn: {learn}\n"
        "Edit these on your Profile page — better skill lists mean better AI matches."
    )


def _notifications_reply(db, user):
    count = _unread_notifications(db, user)
    if count:
        return f"You have {count} unread notification(s) — click the bell icon (top right) to open them."
    return "You're all caught up — no unread notifications. 🎉"


def _reviews_reply():
    return (
        "After a session is completed, the learner can rate it 1–5 stars on the Calendar page. "
        "Great ratings build your reputation — five 5-star reviews earns the “5-Star Teacher” badge."
    )


def _help_reply():
    return (
        "I can answer live from your account:\n"
        "• Points, XP, level, badges, streak\n"
        "• Your best matches and pending requests\n"
        "• Trending skills on the platform\n"
        "• Your next session and how booking works\n"
        "Just ask naturally, e.g. “find me a match” or “what's trending?”"
    )


def _thanks_reply():
    return "You're welcome! Happy skill swapping. ✨"


GREETINGS = {"hi", "hello", "hey", "salam", "aoa", "assalamualaikum", "hola", "yo"}

# Generic words that should never count as a skill-name hit on their own.
_SKILL_STOPWORDS = {
    "what", "who", "how", "can", "the", "me", "my", "i", "to", "a", "an", "for",
    "do", "does", "have", "want", "learn", "teach", "find", "with", "about",
    "skill", "skills", "user", "users", "someone", "anyone", "please", "koi",
    "kaise", "chahiye", "karo", "hai", "and",
}


def _find_skill_in_message(db, message: str):
    """Detect a skill mentioned in the message ('content writing', or just
    'content'). Exact phrase beats word overlap; ties go to more teachers."""
    msg_words = {w for w in re.split(r"[^a-z0-9+#]+", message.lower()) if w}
    if not msg_words:
        return None

    best, best_score = None, 0
    for skill in db.query(Skill).all():
        name_lower = skill.name.lower()
        score = 0
        if re.search(rf"(?<![a-z0-9]){re.escape(name_lower)}(?![a-z0-9])", message.lower()):
            score = 100 + len(name_lower)
        else:
            name_words = {w for w in re.split(r"[^a-z0-9+#]+", name_lower) if w}
            overlap = {
                w for w in (name_words & msg_words)
                if len(w) >= 4 and w not in _SKILL_STOPWORDS
            }
            if overlap:
                score = 10 * len(overlap)
        if score > best_score or (
            score == best_score and score > 0 and len(skill.teachers) > len(best.teachers)
        ):
            best, best_score = skill, score
    return best if best_score >= 10 else None


def _skill_teachers_answer(db, user, skill) -> dict:
    """List the best partners who teach the given skill, with a link that opens
    the Matches page pre-filtered to it."""
    link = {"label": f"Open {skill.name} matches →", "to": f"/discover?skill={quote(skill.name)}"}
    teachers = [t for t in skill.teachers if t.id != user.id and t.role != "admin"]

    if not teachers:
        learners = len([l for l in skill.learners if l.id != user.id])
        reply = (
            f"Nobody teaches {skill.name} yet"
            + (f" — but {learners} learner(s) are waiting for it." if learners else ".")
            + f"\nAdd {skill.name} to your teach list on the Profile page and the demand is all yours!"
        )
        return {"reply": reply, "link": None}

    my_learn_keys = {s.name.lower() for s in user.skills_learn}
    ranked = sorted(teachers, key=lambda t: compute_match_score(user, t), reverse=True)[:4]
    lines = []
    for t in ranked:
        score = round(compute_match_score(user, t))
        wants_mine = any(s.name.lower() in {x.name.lower() for x in user.skills_teach} for s in t.skills_learn)
        tag = " (perfect swap!)" if wants_mine else ""
        lines.append(f"• {t.name} — {score}% match{tag}")

    reply = (
        f"{len(teachers)} user(s) teach {skill.name}. Your best options:\n"
        + "\n".join(lines)
        + "\nTap below to open them on the Matches page and send a request."
    )
    return {"reply": reply, "link": link}


def _contains(message, *words):
    return any(w in message for w in words)


def smart_answer(db, user, raw_message: str) -> dict:
    """Data-backed intent router — no AI key needed. Returns {reply, link}."""
    message = (raw_message or "").lower().strip()

    def plain(text):
        return {"reply": text, "link": None}

    if not message or message.rstrip("!.? ") in GREETINGS:
        return plain(_greeting_reply(user))
    if _contains(message, "point", "balance", "wallet", "sp?", " sp", "token"):
        return plain(_points_reply(db, user))
    if _contains(message, "level", "xp"):
        return plain(_level_reply(user))
    if _contains(message, "badge", "achievement"):
        return plain(_badges_reply(db, user))
    if _contains(message, "streak", "daily", "bonus", "claim"):
        return plain(_streak_reply(user))
    if _contains(message, "trend", "demand", "popular", "hot skill"):
        return plain(_trending_reply(db))
    if _contains(message, "request"):
        return plain(_requests_reply(db, user))

    # Skill mention → list its teachers ("content writing", "python", …)
    skill = _find_skill_in_message(db, message)
    if skill:
        return _skill_teachers_answer(db, user, skill)

    if _contains(message, "match", "partner", "recommend", "who can teach", "find me"):
        return plain(_matches_reply(db, user))
    if _contains(message, "session", "book", "schedule", "calendar", "class"):
        return plain(_sessions_reply(db, user))
    if _contains(message, "my skill", "add skill", "profile", "bio"):
        return plain(_skills_reply(user))
    if _contains(message, "review", "rating", "star"):
        return plain(_reviews_reply())
    if _contains(message, "notification", "bell"):
        return plain(_notifications_reply(db, user))
    if _contains(message, "message", "chat", "inbox"):
        return plain("Open the Chat page to message your matched partners in real time — you can also share files and photos there.")
    if _contains(message, "password", "reset", "account", "email"):
        return plain("You can change your password from Settings, or use “Forgot password?” on the login page to get a reset link.")
    if _contains(message, "thank", "shukria", "great", "nice"):
        return plain(_thanks_reply())
    if _contains(message, "help", "how", "what can", "kaise", "kya kar"):
        return plain(_help_reply())
    return plain(
        "I'm not sure about that one — but I can tell you about your points, matches, "
        "trending skills, sessions, badges, and requests. You can also type any skill "
        "name (like “Content Writing”) and I'll find who teaches it. 🙂"
    )


def smart_reply(db, user, raw_message: str) -> str:
    """String-only variant (kept for tests and simple callers)."""
    return smart_answer(db, user, raw_message)["reply"]


# ------------------------------------------------------------------- AI mode

def _context_snapshot(db, user) -> str:
    tops = _top_matches(db, user)
    trend = _trending(db)
    nxt = _next_session(db, user)
    badges = _badges(db, user)
    teach = ", ".join(s.name for s in user.skills_teach) or "none"
    learn = ", ".join(s.name for s in user.skills_learn) or "none"
    match_txt = "; ".join(f"{t['name']} ({t['skill']}, {t['score']}%)" for t in tops) or "none yet"
    trend_txt = "; ".join(f"{s['name']} ({s['learners']}L/{s['teachers']}T)" for s in trend) or "no data"
    next_txt = f"{nxt['when']} with {nxt['partner']} ({nxt['role']})" if nxt else "none scheduled"
    return (
        f"USER SNAPSHOT — name: {user.name}; skill points: {user.points_balance}; "
        f"level {user.level} ({user.xp} XP); streak: {user.streak} days; "
        f"badges: {', '.join(badges) or 'none'}; teaches: {teach}; wants to learn: {learn}; "
        f"top matches: {match_txt}; trending skills: {trend_txt}; next session: {next_txt}; "
        f"pending incoming requests: {_pending_requests(db, user)}."
    )


SYSTEM_PROMPT = (
    "You are SkillBot, the assistant inside SkillSwap — a peer-to-peer skill exchange "
    "platform where users trade skills using Skill Points instead of money. "
    "Key rules of the platform: teaching a session earns +15 SP and +25 XP, learning earns +15 XP, "
    "booking costs 10 SP, daily wallet bonus is +100 SP, levels rise every 100 XP. "
    "Pages: Dashboard, Matches (AI matching + incoming requests), Chat, Calendar (sessions + reviews), "
    "Progress (XP/badges), Wallet, Profile. "
    "Answer using the user snapshot when relevant. Be concise (under 120 words), friendly, and concrete."
)

_chat_history: dict[int, list] = {}


def chat_reply(db, user, raw_message: str) -> dict:
    """Entry point used by the /api/ai/chat route."""
    message_clean = (raw_message or "").strip().lower()

    # Handle reset command
    if message_clean in {"reset", "clear", "restart"}:
        if user.id in _chat_history:
            _chat_history[user.id] = []
        return {"reply": "Chat history has been reset. How can I help you today?", "mode": "ai"}

    try:
        from services.anthropic_client import is_anthropic_available, call_anthropic
        from services.prompts import CHATBOT_SYSTEM_PROMPT

        anthropic_ready = is_anthropic_available()
    except Exception:
        logger.exception("Anthropic client unavailable; skipping AI mode")
        anthropic_ready = False

    if anthropic_ready:
        try:
            # Maintain and update conversation history
            if user.id not in _chat_history:
                _chat_history[user.id] = []

            history = _chat_history[user.id]
            history.append({"role": "user", "content": raw_message})

            # Keep history to last 20 messages (10 turns)
            if len(history) > 20:
                history = history[-20:]
                _chat_history[user.id] = history

            snapshot = _context_snapshot(db, user)
            full_system = f"{CHATBOT_SYSTEM_PROMPT}\n\n{snapshot}"

            reply = call_anthropic(
                system=full_system,
                messages=history,
                model="claude-sonnet-4-6",
                max_tokens=1000,
            )

            if reply:
                # Add assistant response to history
                history.append({"role": "assistant", "content": reply})
                _chat_history[user.id] = history
                return {"reply": reply, "mode": "ai"}
        except Exception:
            logger.exception("Anthropic chat failed; falling back to OpenAI/smart mode")

    if is_ai_available():
        try:
            client = get_openai_client()
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "system", "content": _context_snapshot(db, user)},
                    {"role": "user", "content": raw_message},
                ],
                max_tokens=220,
            )
            reply = (resp.choices[0].message.content or "").strip()
            if reply:
                return {"reply": reply, "mode": "ai"}
        except Exception:
            logger.exception("OpenAI chat failed; using smart data-backed reply")

    answer = smart_answer(db, user, raw_message)
    out = {"reply": answer["reply"], "mode": "smart"}
    if answer.get("link"):
        out["link"] = answer["link"]
    return out

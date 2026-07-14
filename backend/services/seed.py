"""Seed demo users and matches on first run."""

from datetime import datetime, timezone

from database import store

SEED_USERS = [
    {
        "email": "demo@skillswap.io",
        "password": "demo123",
        "display_name": "Muhammad",
        "provider": "email",
        "skills_teach": ["Python", "Web Development"],
        "skills_learn": ["Video Editing", "UI Design"],
        "skill_points": 200,
        "xp": 450,
        "level": 3,
        "heart_tokens_balance": 100,
        "role": "user",
        "onboarding_complete": True,
        "activity_streak": 5,
    },
    {
        "email": "roman@skillswap.io",
        "password": "demo123",
        "display_name": "Roman",
        "provider": "google",
        "skills_teach": ["Video Editing", "Motion Graphics"],
        "skills_learn": ["Python"],
        "skill_points": 180,
        "xp": 320,
        "level": 2,
        "heart_tokens_balance": 85,
        "role": "user",
        "onboarding_complete": True,
        "activity_streak": 3,
    },
    {
        "email": "arunima@skillswap.io",
        "password": "demo123",
        "display_name": "Arunima",
        "provider": "google",
        "skills_teach": ["Video Editing", "Photography"],
        "skills_learn": ["React"],
        "skill_points": 150,
        "xp": 210,
        "level": 2,
        "heart_tokens_balance": 90,
        "role": "user",
        "onboarding_complete": True,
        "activity_streak": 2,
    },
    {
        "email": "rafael@skillswap.io",
        "password": "demo123",
        "display_name": "Rafael",
        "provider": "facebook",
        "skills_teach": ["Video Editing", "Color Grading"],
        "skills_learn": ["JavaScript"],
        "skill_points": 140,
        "xp": 190,
        "level": 2,
        "heart_tokens_balance": 75,
        "role": "user",
        "onboarding_complete": True,
        "activity_streak": 1,
    },
    {
        "email": "admin@skillswap.io",
        "password": "admin123",
        "display_name": "Admin",
        "provider": "email",
        "skills_teach": ["Platform Management"],
        "skills_learn": [],
        "skill_points": 999,
        "xp": 0,
        "level": 10,
        "heart_tokens_balance": 100,
        "role": "admin",
        "onboarding_complete": True,
        "activity_streak": 30,
    },
]


def _match_score(user_skills_learn: list, other_skills_teach: list) -> int:
    if not user_skills_learn or not other_skills_teach:
        return 0
    overlap = set(s.lower() for s in user_skills_learn) & set(
        s.lower() for s in other_skills_teach
    )
    if not overlap:
        return 0
    return min(95, 40 + len(overlap) * 18)


def seed_if_empty() -> None:
    if store.count("users") > 0:
        return

    now = datetime.now(timezone.utc).isoformat()
    user_ids = []

    for u in SEED_USERS:
        u = {**u, "notification_preferences": {"email_matches": True, "email_sessions": True, "push_enabled": False},
             "heart_tokens_last_reset": now, "last_active_at": now}
        created = store.insert_one("users", u)
        user_ids.append(created["_id"])

    demo_id = user_ids[0]
    others = user_ids[1:4]

    for other_id in others:
        other = store.find_one("users", {"_id": other_id})
        demo = store.find_one("users", {"_id": demo_id})
        skill = next(
            (s for s in other["skills_teach"] if s in demo["skills_learn"]),
            other["skills_teach"][0],
        )
        score = _match_score(demo["skills_learn"], other["skills_teach"])
        store.insert_one(
            "matches",
            {
                "user_a_id": demo_id,
                "user_b_id": other_id,
                "skill_offered": skill,
                "skill_requested": skill,
                "match_score": score,
                "status": "pending",
                "matched_at": now,
            },
        )

    store.insert_one(
        "sessions",
        {
            "match_id": None,
            "host_id": others[0],
            "guest_id": demo_id,
            "skill": "Video Editing",
            "title": "Intro to Video Editing",
            "description": "Learn basic cuts and transitions",
            "scheduled_at": now,
            "duration_minutes": 60,
            "timezone": "UTC",
            "status": "scheduled",
            "heart_tokens_cost": 10,
            "xp_awarded": 25,
        },
    )

    chat = store.insert_one(
        "chats",
        {
            "match_id": None,
            "participants": [demo_id, others[0]],
            "last_message_preview": "Hey! Ready for our session?",
            "last_message_at": now,
            "unread_counts": {demo_id: 1, others[0]: 0},
        },
    )

    store.insert_one(
        "messages",
        {
            "chat_id": chat["_id"],
            "sender_id": others[0],
            "text": "Hey! Ready for our session?",
            "type": "text",
        },
    )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    store.insert_one(
        "tokens",
        {
            "user_id": demo_id,
            "date": today,
            "allocated": 100,
            "spent": 0,
            "remaining": 100,
            "transactions": [],
        },
    )

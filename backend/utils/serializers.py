def user_to_dict(user, include_skills=True):
    data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "points_balance": user.points_balance,
        "xp": user.xp,
        "level": user.level,
        "streak": user.streak,
        "role": user.role,
        "status": getattr(user, "status", None) or "active",
        "onboarding_complete": user.onboarding_complete,
        "has_seen_welcome_popup": bool(getattr(user, "has_seen_welcome_popup", False)),
        "last_daily_bonus_at": (
            user.last_daily_bonus_at.isoformat()
            if getattr(user, "last_daily_bonus_at", None)
            else None
        ),
        "last_daily_bonus_date": (
            user.last_daily_bonus_date.isoformat()
            if getattr(user, "last_daily_bonus_date", None)
            else (
                user.last_daily_bonus_at.date().isoformat()
                if getattr(user, "last_daily_bonus_at", None)
                else None
            )
        ),
        "availability": user.availability,
        "is_online": user.is_online,
    }
    if include_skills:
        data["skills_teach"] = [s.name for s in user.skills_teach]
        data["skills_learn"] = [s.name for s in user.skills_learn]
    return data

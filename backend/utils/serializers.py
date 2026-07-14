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
        "onboarding_complete": user.onboarding_complete,
        "availability": user.availability,
        "is_online": user.is_online,
    }
    if include_skills:
        data["skills_teach"] = [s.name for s in user.skills_teach]
        data["skills_learn"] = [s.name for s in user.skills_learn]
    return data

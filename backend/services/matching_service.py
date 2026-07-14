def skill_overlap(user, candidate) -> dict:
    """Detailed overlap between two users.

    Returns exact skill matches (user wants to learn what candidate teaches, or
    vice versa) plus *related* matches by shared category (same category, not the
    exact skill). Related matches let us surface partial fits instead of only
    exact skill-id equality.
    """
    user_learn = {s.name.lower(): s for s in user.skills_learn}
    user_teach = {s.name.lower(): s for s in user.skills_teach}
    cand_learn = {s.name.lower(): s for s in candidate.skills_learn}
    cand_teach = {s.name.lower(): s for s in candidate.skills_teach}

    # Exact: candidate can teach what user wants, or user can teach what candidate wants.
    exact_names = (set(user_learn) & set(cand_teach)) | (set(user_teach) & set(cand_learn))
    exact = sorted({user_learn.get(n) or user_teach.get(n) for n in exact_names}, key=lambda s: s.name)
    exact_skills = [s.name for s in exact]

    # Related: same category but not an exact skill match.
    want_cats = {s.category for s in user.skills_learn}
    cand_teach_related = {
        s.name for s in candidate.skills_teach
        if s.category in want_cats and s.name.lower() not in exact_names
    }
    teach_cats = {s.category for s in user.skills_teach}
    cand_learn_related = {
        s.name for s in candidate.skills_learn
        if s.category in teach_cats and s.name.lower() not in exact_names
    }
    related_skills = sorted(cand_teach_related | cand_learn_related)

    return {
        "exact": exact_skills,
        "related": related_skills,
        "exact_count": len(exact_skills),
        "related_count": len(related_skills),
    }


def compute_match_score(user, candidate) -> float:
    overlap_info = skill_overlap(user, candidate)
    exact = overlap_info["exact_count"]
    related = overlap_info["related_count"]
    overlap = exact + related
    if overlap == 0:
        return 0

    rating_bonus = min(candidate.level * 5, 20)
    activity_bonus = min(candidate.streak * 2, 10)
    # Exact matches weigh more than related-by-category matches.
    base = 40 + exact * 18 + related * 7
    return min(98.0, base + rating_bonus + activity_bonus)


def discover_matches(db, user_id: int, limit: int = 20):
    from database.models import User

    user = db.get(User, user_id)
    if not user:
        return []

    results = []
    for candidate in db.query(User).filter(User.id != user_id).all():
        score = compute_match_score(user, candidate)
        if score <= 0:
            continue
        skill = next(
            (s.name for s in candidate.skills_teach if s.name.lower() in {x.name.lower() for x in user.skills_learn}),
            candidate.skills_teach[0].name if candidate.skills_teach else "General",
        )
        results.append({"user": candidate, "match_score": round(score, 1), "skill_offered": skill})

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:limit]

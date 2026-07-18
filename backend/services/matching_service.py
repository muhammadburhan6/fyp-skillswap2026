"""Skill matching: exact, reciprocal (mutual), and related-by-category."""

from sqlalchemy.orm import joinedload

from services.skill_utils import normalize_skill_key, skill_keys


def skill_overlap(user, candidate) -> dict:
    """Detailed overlap between two users.

    Exact matches (either direction):
      - user.learn ∩ candidate.teach
      - user.teach ∩ candidate.learn

    Reciprocal / mutual: BOTH directions non-empty (perfect swap).
    Related: same category, not an exact skill name match.
    """
    user_learn = {normalize_skill_key(s.name): s for s in user.skills_learn}
    user_teach = {normalize_skill_key(s.name): s for s in user.skills_teach}
    cand_learn = {normalize_skill_key(s.name): s for s in candidate.skills_learn}
    cand_teach = {normalize_skill_key(s.name): s for s in candidate.skills_teach}

    # A wants what B teaches
    a_learns_from_b = set(user_learn) & set(cand_teach)
    # B wants what A teaches
    b_learns_from_a = set(user_teach) & set(cand_learn)

    exact_keys = a_learns_from_b | b_learns_from_a
    exact_skills = []
    for key in sorted(exact_keys):
        skill = user_learn.get(key) or user_teach.get(key) or cand_teach.get(key) or cand_learn.get(key)
        if skill is not None:
            exact_skills.append(skill.name)

    is_reciprocal = bool(a_learns_from_b) and bool(b_learns_from_a)

    # Related: same category but not an exact skill match.
    want_cats = {s.category for s in user.skills_learn if s.category}
    cand_teach_related = {
        s.name for s in candidate.skills_teach
        if s.category in want_cats and normalize_skill_key(s.name) not in exact_keys
    }
    teach_cats = {s.category for s in user.skills_teach if s.category}
    cand_learn_related = {
        s.name for s in candidate.skills_learn
        if s.category in teach_cats and normalize_skill_key(s.name) not in exact_keys
    }
    related_skills = sorted(cand_teach_related | cand_learn_related)

    return {
        "exact": exact_skills,
        "related": related_skills,
        "exact_count": len(exact_skills),
        "related_count": len(related_skills),
        "a_learns_from_b": sorted(user_learn[k].name for k in a_learns_from_b),
        "b_learns_from_a": sorted(user_teach[k].name for k in b_learns_from_a),
        "is_reciprocal": is_reciprocal,
    }


def compute_match_score(user, candidate) -> float:
    overlap = skill_overlap(user, candidate)
    exact = overlap["exact_count"]
    related = overlap["related_count"]
    if exact == 0 and related == 0:
        return 0.0

    rating_bonus = min(candidate.level * 5, 20)
    activity_bonus = min(candidate.streak * 2, 10)
    # Exact matches weigh more than related-by-category matches.
    base = 40 + exact * 18 + related * 7
    # Perfect swaps (both directions) get a strong boost so they rank first.
    if overlap["is_reciprocal"]:
        base += 25
    return min(99.0, base + rating_bonus + activity_bonus)


def discover_matches(db, user_id: int, limit: int = 20, skill_query: str | None = None):
    from database.models import User

    user = (
        db.query(User)
        .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        return []

    candidates = (
        db.query(User)
        .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
        .filter(User.id != user_id, User.role != "admin")
        .all()
    )

    # Skill search: only candidates who teach a matching skill, always shown
    # even when the general compatibility score would be 0.
    if skill_query:
        needle = skill_query.strip().lower()
        matched = []
        for candidate in candidates:
            hit = next(
                (s.name for s in candidate.skills_teach if needle in s.name.lower()),
                None,
            )
            if hit:
                matched.append((candidate, hit))
        matched.sort(key=lambda pair: compute_match_score(user, pair[0]), reverse=True)
        results = []
        for candidate, skill_name in matched[:limit]:
            overlap = skill_overlap(user, candidate)
            results.append({
                "user": candidate,
                "match_score": round(compute_match_score(user, candidate), 1),
                "skill_offered": skill_name,
                "is_reciprocal": overlap["is_reciprocal"],
                "overlap": overlap,
            })
        return results

    user_learn_keys = skill_keys(user.skills_learn)
    results = []
    for candidate in candidates:
        overlap = skill_overlap(user, candidate)
        score = compute_match_score(user, candidate)
        if score <= 0:
            continue

        # Prefer a skill the candidate teaches that the user wants to learn.
        skill = next(
            (
                s.name for s in candidate.skills_teach
                if normalize_skill_key(s.name) in user_learn_keys
            ),
            None,
        )
        if skill is None and overlap["a_learns_from_b"]:
            skill = overlap["a_learns_from_b"][0]
        if skill is None and candidate.skills_teach:
            skill = candidate.skills_teach[0].name
        if skill is None:
            skill = "General"

        results.append({
            "user": candidate,
            "match_score": round(score, 1),
            "skill_offered": skill,
            "is_reciprocal": overlap["is_reciprocal"],
            "overlap": overlap,
        })

    results.sort(
        key=lambda x: (x["is_reciprocal"], x["match_score"]),
        reverse=True,
    )
    return results[:limit]

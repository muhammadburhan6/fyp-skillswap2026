"""XP/level progression and badge-awarding logic.

Badges are seeded once in services/seed_db.py (see BADGES). This module is
the only place that ever inserts a UserBadge row from real user activity.
"""

from __future__ import annotations

from database.models import Badge, Review, Session as SwapSession, UserBadge

XP_PER_LEVEL = 100

FIRST_SWAP = "First Swap"
FIVE_STAR_TEACHER = "5-Star Teacher"
TEN_SESSIONS_STREAK = "10 Sessions Streak"


def award_xp(db, user, amount: int) -> dict:
    """Add XP and recompute level from the XP_PER_LEVEL threshold."""
    previous_level = user.level or 1
    user.xp = (user.xp or 0) + amount
    user.level = 1 + (user.xp // XP_PER_LEVEL)
    return {"xp": user.xp, "level": user.level, "leveled_up": user.level > previous_level}


def _completed_session_count(db, user_id: int) -> int:
    return (
        db.query(SwapSession)
        .filter(
            (SwapSession.teacher_id == user_id) | (SwapSession.learner_id == user_id),
            SwapSession.status == "completed",
        )
        .count()
    )


def _has_badge(db, user_id: int, badge_name: str) -> bool:
    badge = db.query(Badge).filter_by(name=badge_name).first()
    if not badge:
        return True  # badge isn't seeded, nothing to award
    return (
        db.query(UserBadge)
        .filter_by(user_id=user_id, badge_id=badge.id)
        .first()
        is not None
    )


def _award_badge(db, user_id: int, badge_name: str) -> bool:
    badge = db.query(Badge).filter_by(name=badge_name).first()
    if not badge:
        return False
    db.add(UserBadge(user_id=user_id, badge_id=badge.id))
    return True


def check_and_award_badges(db, user_id: int) -> list[str]:
    """Evaluate every badge condition for a user and award any newly-earned ones."""
    newly_awarded = []

    completed = _completed_session_count(db, user_id)

    if completed >= 1 and not _has_badge(db, user_id, FIRST_SWAP):
        _award_badge(db, user_id, FIRST_SWAP)
        newly_awarded.append(FIRST_SWAP)

    if completed >= 10 and not _has_badge(db, user_id, TEN_SESSIONS_STREAK):
        _award_badge(db, user_id, TEN_SESSIONS_STREAK)
        newly_awarded.append(TEN_SESSIONS_STREAK)

    five_star_count = (
        db.query(Review)
        .filter(Review.reviewee_id == user_id, Review.rating == 5)
        .count()
    )
    if five_star_count >= 5 and not _has_badge(db, user_id, FIVE_STAR_TEACHER):
        _award_badge(db, user_id, FIVE_STAR_TEACHER)
        newly_awarded.append(FIVE_STAR_TEACHER)

    return newly_awarded

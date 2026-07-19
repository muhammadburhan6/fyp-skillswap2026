"""Access checks for LMS materials — owners and swap partners only."""

from __future__ import annotations

from sqlalchemy import and_, or_

from database.models import Match, Session as SwapSession


def can_view_owner_materials(db, viewer_id: int, owner_id: int) -> bool:
    """True if viewer is the owner, has an accepted Match, or shares a session."""
    if viewer_id == owner_id:
        return True

    accepted = (
        db.query(Match.id)
        .filter(
            Match.status == "accepted",
            or_(
                and_(Match.user_a_id == viewer_id, Match.user_b_id == owner_id),
                and_(Match.user_a_id == owner_id, Match.user_b_id == viewer_id),
            ),
        )
        .first()
    )
    if accepted:
        return True

    shared_session = (
        db.query(SwapSession.id)
        .filter(
            SwapSession.status.in_(("scheduled", "completed")),
            or_(
                and_(
                    SwapSession.teacher_id == owner_id,
                    SwapSession.learner_id == viewer_id,
                ),
                and_(
                    SwapSession.teacher_id == viewer_id,
                    SwapSession.learner_id == owner_id,
                ),
            ),
        )
        .first()
    )
    return shared_session is not None


def partner_ids_for_user(db, user_id: int) -> set[int]:
    """User ids the current user can browse materials for (excluding self)."""
    partners: set[int] = set()

    matches = (
        db.query(Match)
        .filter(
            Match.status == "accepted",
            or_(Match.user_a_id == user_id, Match.user_b_id == user_id),
        )
        .all()
    )
    for m in matches:
        partners.add(m.user_b_id if m.user_a_id == user_id else m.user_a_id)

    sessions = (
        db.query(SwapSession)
        .filter(
            SwapSession.status.in_(("scheduled", "completed")),
            or_(
                SwapSession.teacher_id == user_id,
                SwapSession.learner_id == user_id,
            ),
        )
        .all()
    )
    for s in sessions:
        other = s.learner_id if s.teacher_id == user_id else s.teacher_id
        if other and other != user_id:
            partners.add(other)

    return partners

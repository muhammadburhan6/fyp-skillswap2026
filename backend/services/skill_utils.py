"""Skill name normalization and get-or-create helpers."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func

from database.models import Skill


def normalize_skill_key(name: str) -> str:
    """Canonical key for matching: trimmed, collapsed whitespace, lowercased."""
    if not isinstance(name, str):
        return ""
    return " ".join(name.strip().split()).lower()


def normalize_skill_display(name: str) -> str:
    """Display form stored in DB: trimmed + collapsed whitespace."""
    if not isinstance(name, str):
        return ""
    return " ".join(name.strip().split())


def get_or_create_skill(db, name: str, category: str = "General") -> Optional[Skill]:
    """Find a skill case-insensitively, or create it with a normalized name."""
    display = normalize_skill_display(name)
    key = normalize_skill_key(display)
    if not key:
        return None

    skill = (
        db.query(Skill)
        .filter(func.lower(Skill.name) == key)
        .first()
    )
    if skill:
        return skill

    skill = Skill(name=display, category=category or "General")
    db.add(skill)
    db.flush()
    return skill


def skill_keys(skills) -> set[str]:
    """Set of normalized keys from Skill objects or plain strings."""
    keys = set()
    for s in skills or []:
        raw = s.name if hasattr(s, "name") else s
        key = normalize_skill_key(raw)
        if key:
            keys.add(key)
    return keys

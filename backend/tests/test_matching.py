"""Tests for reciprocal skill matching (perfect teach/learn swaps)."""

import uuid

from sqlalchemy.orm import joinedload

from database.models import SessionLocal, User
from services.matching_service import discover_matches, skill_overlap
from services.recommendation_service import get_candidate_matches, invalidate_cache
from services.skill_utils import get_or_create_skill, normalize_skill_key
from tests.conftest import auth_header


def _email(prefix="match"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _set_skills(user_id, teach, learn):
    db = SessionLocal()
    try:
        u = db.get(User, user_id)
        u.skills_teach.clear()
        u.skills_learn.clear()
        for name in teach:
            skill = get_or_create_skill(db, name)
            if skill:
                u.skills_teach.append(skill)
        for name in learn:
            skill = get_or_create_skill(db, name)
            if skill:
                u.skills_learn.append(skill)
        db.commit()
        invalidate_cache(user_id)
    finally:
        db.close()


def test_normalize_skill_key_strips_and_lowercases():
    assert normalize_skill_key("  Web Designing  ") == "web designing"
    assert normalize_skill_key("Digital Marketing") == normalize_skill_key("digital marketing")


def test_reciprocal_digital_marketing_web_designing(make_user):
    """A teaches Digital Marketing / learns Web Designing;
    B teaches Web Designing / learns Digital Marketing → both match each other.
    """
    a = make_user(_email("a"), name="Account A")
    b = make_user(_email("b"), name="Account B")

    _set_skills(a["id"], teach=["Digital Marketing"], learn=["Web Designing"])
    _set_skills(b["id"], teach=["Web Designing"], learn=["Digital Marketing"])

    db = SessionLocal()
    try:
        user_a = (
            db.query(User)
            .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
            .filter(User.id == a["id"])
            .one()
        )
        user_b = (
            db.query(User)
            .options(joinedload(User.skills_teach), joinedload(User.skills_learn))
            .filter(User.id == b["id"])
            .one()
        )

        overlap_ab = skill_overlap(user_a, user_b)
        overlap_ba = skill_overlap(user_b, user_a)

        assert overlap_ab["is_reciprocal"] is True
        assert overlap_ba["is_reciprocal"] is True
        assert overlap_ab["exact_count"] >= 2
        assert any(normalize_skill_key(s) == "web designing" for s in overlap_ab["a_learns_from_b"])
        assert any(normalize_skill_key(s) == "digital marketing" for s in overlap_ab["b_learns_from_a"])

        matches_for_a = discover_matches(db, a["id"])
        matches_for_b = discover_matches(db, b["id"])

        a_ids = {m["user"].id for m in matches_for_a}
        b_ids = {m["user"].id for m in matches_for_b}
        assert b["id"] in a_ids, "B should appear in A's discover list"
        assert a["id"] in b_ids, "A should appear in B's discover list"

        match_ab = next(m for m in matches_for_a if m["user"].id == b["id"])
        match_ba = next(m for m in matches_for_b if m["user"].id == a["id"])
        assert match_ab["is_reciprocal"] is True
        assert match_ba["is_reciprocal"] is True
        assert match_ab["match_score"] >= 80
        assert match_ba["match_score"] >= 80
    finally:
        db.close()


def test_reciprocal_match_survives_case_and_spacing(make_user):
    """Matching must ignore case and extra spaces in skill names."""
    a = make_user(_email("case_a"), name="Case A")
    b = make_user(_email("case_b"), name="Case B")

    _set_skills(a["id"], teach=["digital marketing"], learn=["  Web Designing "])
    _set_skills(b["id"], teach=["WEB DESIGNING"], learn=["Digital Marketing"])

    db = SessionLocal()
    try:
        matches_for_a = discover_matches(db, a["id"])
        assert any(m["user"].id == b["id"] and m["is_reciprocal"] for m in matches_for_a)
    finally:
        db.close()


def test_recommendations_include_reciprocal_pair(make_user):
    a = make_user(_email("rec_a"), name="Rec A")
    b = make_user(_email("rec_b"), name="Rec B")

    _set_skills(a["id"], teach=["Digital Marketing"], learn=["Web Designing"])
    _set_skills(b["id"], teach=["Web Designing"], learn=["Digital Marketing"])

    db = SessionLocal()
    try:
        _, candidates = get_candidate_matches(db, a["id"])
        ids = {c["user"].id for c in candidates}
        assert b["id"] in ids
        cand_b = next(c for c in candidates if c["user"].id == b["id"])
        assert cand_b["is_reciprocal"] is True
        assert candidates[0]["user"].id == b["id"]
    finally:
        db.close()


def test_discover_api_returns_reciprocal_match(client, make_user):
    a = make_user(_email("api_a"), name="API A")
    b = make_user(_email("api_b"), name="API B")

    _set_skills(a["id"], teach=["Digital Marketing"], learn=["Web Designing"])
    _set_skills(b["id"], teach=["Web Designing"], learn=["Digital Marketing"])

    resp = client.get("/api/matches/discover", headers=auth_header(a["token"]))
    assert resp.status_code == 200
    matches = resp.get_json()["matches"]
    partner = next((m for m in matches if m["user"]["id"] == b["id"]), None)
    assert partner is not None
    assert partner["is_reciprocal"] is True
    assert partner["match_score"] > 0

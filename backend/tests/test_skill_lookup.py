"""Tests for SkillBot skill-name lookup, discover skill search, and bulk seeding."""

import uuid

from database.models import SessionLocal, Skill, User
from services.matching_service import discover_matches
from services.seed_db import BULK_DOMAIN, seed_bulk
from services.skillbot_service import smart_answer
from tests.conftest import auth_header


def _email(prefix="lookup"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _ensure_skill(db, name, category="Test"):
    skill = db.query(Skill).filter(Skill.name.ilike(name)).first()
    if not skill:
        skill = Skill(name=name, category=category)
        db.add(skill)
        db.flush()
    return skill


def test_typing_skill_name_lists_its_teachers(make_user):
    asker_ref = make_user(_email("asker"))
    teacher_ref = make_user(_email("teacher"), name="Writing Guru")
    db = SessionLocal()
    try:
        skill = _ensure_skill(db, "Content Writing", "Writing")
        teacher = db.get(User, teacher_ref["id"])
        teacher.skills_teach.append(skill)
        db.commit()

        asker = db.get(User, asker_ref["id"])
        answer = smart_answer(db, asker, "content writing")
        assert "Writing Guru" in answer["reply"]
        assert answer["link"] is not None
        assert "/discover?skill=Content%20Writing" == answer["link"]["to"]
    finally:
        db.close()


def test_partial_word_finds_skill(make_user):
    asker_ref = make_user(_email("asker"))
    teacher_ref = make_user(_email("teacher"), name="Partial Teacher")
    db = SessionLocal()
    try:
        skill = _ensure_skill(db, "Content Writing", "Writing")
        teacher = db.get(User, teacher_ref["id"])
        if skill not in teacher.skills_teach:
            teacher.skills_teach.append(skill)
        db.commit()

        asker = db.get(User, asker_ref["id"])
        answer = smart_answer(db, asker, "content")
        assert "Content Writing" in answer["reply"]
    finally:
        db.close()


def test_skill_with_no_teachers_prompts_user_to_teach(make_user):
    asker_ref = make_user(_email("asker"))
    db = SessionLocal()
    try:
        lonely = _ensure_skill(db, f"Lonelyskill{uuid.uuid4().hex[:6]}", "Test")
        db.commit()
        asker = db.get(User, asker_ref["id"])
        answer = smart_answer(db, asker, lonely.name.lower())
        assert "Nobody teaches" in answer["reply"]
        assert answer["link"] is None
    finally:
        db.close()


def test_chat_endpoint_includes_link(client, make_user):
    asker = make_user(_email("asker"))
    teacher_ref = make_user(_email("teacher"), name="Link Teacher")
    db = SessionLocal()
    try:
        skill = _ensure_skill(db, "Content Writing", "Writing")
        teacher = db.get(User, teacher_ref["id"])
        if skill not in teacher.skills_teach:
            teacher.skills_teach.append(skill)
        db.commit()
    finally:
        db.close()

    resp = client.post(
        "/api/ai/chat",
        json={"message": "who teaches content writing?"},
        headers=auth_header(asker["token"]),
    )
    body = resp.get_json()
    assert body["mode"] == "smart"
    assert "link" in body
    assert body["link"]["to"].startswith("/discover?skill=")


def test_discover_skill_search_spans_all_users(client, make_user):
    searcher = make_user(_email("searcher"))
    teacher_ref = make_user(_email("teacher"), name="Search Target")
    db = SessionLocal()
    try:
        unique = f"Searchable{uuid.uuid4().hex[:6]}"
        skill = _ensure_skill(db, unique, "Test")
        teacher = db.get(User, teacher_ref["id"])
        teacher.skills_teach.append(skill)
        db.commit()
    finally:
        db.close()

    resp = client.get(
        f"/api/matches/discover?skill={unique.lower()}",
        headers=auth_header(searcher["token"]),
    )
    matches = resp.get_json()["matches"]
    assert any(m["user"]["name"] == "Search Target" for m in matches)
    assert all(unique.lower() in m["skill_offered"].lower() for m in matches)


def test_seed_bulk_creates_users_with_full_coverage():
    db = SessionLocal()
    try:
        result = seed_bulk(db, target_users=40)
        assert result["total_bulk_users"] >= 40

        # every catalog skill has teachers and learners
        content = db.query(Skill).filter(Skill.name == "Content Writing").first()
        assert content is not None
        assert len(content.teachers) >= 1
        assert len(content.learners) >= 1

        # idempotent: second run creates nothing new
        again = seed_bulk(db, target_users=40)
        assert again["created_users"] == 0

        # cleanup bulk users from the shared test DB
        bulk = db.query(User).filter(User.email.like(f"%{BULK_DOMAIN}")).all()
        for u in bulk:
            u.skills_teach.clear()
            u.skills_learn.clear()
            db.delete(u)
        db.commit()
    finally:
        db.close()

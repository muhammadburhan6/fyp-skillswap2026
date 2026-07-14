from database.models import (
    Badge,
    Conversation,
    Match,
    Message,
    PointsTransaction,
    Session,
    Skill,
    User,
    UserBadge,
    conversation_participants,
    user_skill_learn,
    user_skill_teach,
)
from database.models import SessionLocal, init_db
from datetime import datetime, timezone, timedelta
from utils.passwords import hash_password


SKILL_CATALOG = [
    ("Python", "Coding"), ("React", "Coding"), ("UI Design", "Design"),
    ("Video Editing", "Design"), ("Spanish", "Languages"), ("Guitar", "Music"),
    ("Fitness Coaching", "Fitness"), ("Public Speaking", "Business"),
    ("Photography", "Design"), ("JavaScript", "Coding"),
]

BADGES = [
    ("First Swap", "Completed your first skill swap"),
    ("5-Star Teacher", "Received five 5-star reviews"),
    ("10 Sessions Streak", "Completed 10 sessions in a row"),
]


def seed_database():
    init_db()
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        skills = {}
        for name, cat in SKILL_CATALOG:
            s = Skill(name=name, category=cat)
            db.add(s)
            db.flush()
            skills[name] = s

        demo_password = hash_password("demo123")

        demo = User(
            name="Muhammad",
            email="demo@skillswap.io",
            password_hash=demo_password,
            bio="Love teaching web dev and learning design.",
            points_balance=200,
            xp=450,
            level=3,
            streak=5,
            onboarding_complete=True,
        )
        roman = User(name="Roman", email="roman@skillswap.io", bio="Video editor & motion designer", onboarding_complete=True, points_balance=180)
        arunima = User(name="Arunima", email="arunima@skillswap.io", bio="Photographer learning React", onboarding_complete=True, points_balance=150)
        admin = User(name="Admin", email="admin@skillswap.io", role="admin", onboarding_complete=True, points_balance=999)
        db.add_all([demo, roman, arunima, admin])
        db.flush()

        demo.skills_teach.extend([skills["Python"], skills["React"]])
        demo.skills_learn.extend([skills["Video Editing"], skills["UI Design"]])
        roman.skills_teach.append(skills["Video Editing"])
        roman.skills_learn.append(skills["Python"])
        arunima.skills_teach.append(skills["Photography"])
        arunima.skills_learn.append(skills["React"])

        db.add(Match(user_a_id=demo.id, user_b_id=roman.id, match_score=92, status="accepted"))
        db.add(Match(user_a_id=demo.id, user_b_id=arunima.id, match_score=78, status="pending"))

        conv = Conversation()
        conv.participants.extend([demo, roman])
        db.add(conv)
        db.flush()
        db.add(Message(conversation_id=conv.id, sender_id=roman.id, content="Hey! Ready for our session?"))

        db.add(Session(
            teacher_id=roman.id,
            learner_id=demo.id,
            skill_id=skills["Video Editing"].id,
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
            status="scheduled",
            points_cost=10,
        ))

        for name, desc in BADGES:
            db.add(Badge(name=name, description=desc))
        db.flush()
        first_badge = db.query(Badge).filter_by(name="First Swap").first()
        db.add(UserBadge(user_id=demo.id, badge_id=first_badge.id))

        db.add(PointsTransaction(user_id=demo.id, amount=200, reason="signup_bonus"))
        db.commit()
    finally:
        db.close()

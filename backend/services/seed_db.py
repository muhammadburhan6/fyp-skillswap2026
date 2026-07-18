from database.models import (
    Badge,
    Conversation,
    Dispute,
    Match,
    Message,
    PointsTransaction,
    Session,
    Skill,
    SkillModeration,
    User,
    UserBadge,
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

# Full catalog used by seed_bulk() so every kind of skill has matches.
FULL_SKILL_CATALOG = [
    # Coding
    ("Python", "Coding"), ("JavaScript", "Coding"), ("React", "Coding"), ("Node.js", "Coding"),
    ("Flask", "Coding"), ("Django", "Coding"), ("Java", "Coding"), ("C++", "Coding"),
    ("C#", "Coding"), ("SQL", "Coding"), ("MongoDB", "Coding"), ("HTML & CSS", "Coding"),
    ("TypeScript", "Coding"), ("Git & GitHub", "Coding"), ("Flutter", "Coding"),
    ("Android Development", "Coding"), ("iOS Development", "Coding"), ("WordPress", "Coding"),
    ("Web Development", "Coding"), ("Game Development", "Coding"),
    # Data & AI
    ("Machine Learning", "Data & AI"), ("Deep Learning", "Data & AI"), ("Data Analysis", "Data & AI"),
    ("Data Science", "Data & AI"), ("Power BI", "Data & AI"), ("Excel", "Data & AI"),
    ("Statistics", "Data & AI"), ("Prompt Engineering", "Data & AI"), ("Computer Vision", "Data & AI"),
    # Design
    ("UI Design", "Design"), ("UX Research", "Design"), ("Graphic Design", "Design"),
    ("Figma", "Design"), ("Adobe Photoshop", "Design"), ("Adobe Illustrator", "Design"),
    ("Logo Design", "Design"), ("3D Modeling", "Design"), ("Animation", "Design"),
    ("Canva Design", "Design"), ("Interior Design", "Design"),
    # Video & Photo
    ("Video Editing", "Video & Photo"), ("Photography", "Video & Photo"), ("Videography", "Video & Photo"),
    ("Color Grading", "Video & Photo"), ("YouTube Content Creation", "Video & Photo"),
    ("Adobe Premiere Pro", "Video & Photo"), ("After Effects", "Video & Photo"),
    # Writing
    ("Content Writing", "Writing"), ("Copywriting", "Writing"), ("Technical Writing", "Writing"),
    ("Blog Writing", "Writing"), ("Creative Writing", "Writing"), ("Academic Writing", "Writing"),
    ("Resume Writing", "Writing"), ("Proofreading", "Writing"),
    # Business & Marketing
    ("Digital Marketing", "Marketing"), ("SEO", "Marketing"), ("Social Media Marketing", "Marketing"),
    ("Email Marketing", "Marketing"), ("Facebook Ads", "Marketing"), ("Content Marketing", "Marketing"),
    ("Freelancing", "Business"), ("Entrepreneurship", "Business"), ("Project Management", "Business"),
    ("Public Speaking", "Business"), ("Accounting", "Business"), ("E-commerce", "Business"),
    ("Amazon FBA", "Business"), ("Personal Finance", "Business"),
    # Languages
    ("English Speaking", "Languages"), ("IELTS Preparation", "Languages"), ("Urdu", "Languages"),
    ("Arabic", "Languages"), ("French", "Languages"), ("German", "Languages"),
    ("Chinese", "Languages"), ("Spanish", "Languages"),
    # Music & Arts
    ("Guitar", "Music"), ("Piano", "Music"), ("Singing", "Music"), ("Music Production", "Music"),
    ("Drawing", "Arts"), ("Painting", "Arts"), ("Calligraphy", "Arts"),
    # Lifestyle & Academics
    ("Cooking", "Lifestyle"), ("Baking", "Lifestyle"), ("Fitness Training", "Fitness"),
    ("Yoga", "Fitness"), ("Chess", "Lifestyle"), ("Gardening", "Lifestyle"),
    ("First Aid", "Lifestyle"), ("Sewing & Tailoring", "Lifestyle"),
    ("Mathematics Tutoring", "Academics"), ("Physics Tutoring", "Academics"),
    ("Chemistry Tutoring", "Academics"), ("Quran Recitation", "Academics"),
]

FIRST_NAMES = [
    "Ahmed", "Ali", "Hassan", "Hussain", "Usman", "Bilal", "Hamza", "Zain", "Fahad", "Saad",
    "Danish", "Kashif", "Imran", "Asad", "Taha", "Rayyan", "Shayan", "Umar", "Haris", "Junaid",
    "Ayesha", "Fatima", "Zainab", "Maryam", "Khadija", "Amna", "Hira", "Sana", "Iqra", "Mahnoor",
    "Momina", "Rabia", "Laiba", "Eman", "Noor", "Areeba", "Fiza", "Alishba", "Sadia", "Nimra",
    "Daniel", "Sarah", "James", "Emily", "Michael", "Sophia", "David", "Olivia", "John", "Emma",
    "Ryan", "Mia", "Kevin", "Lily", "Adam", "Zoe", "Omar", "Layla", "Yusuf", "Amara",
]

LAST_NAMES = [
    "Khan", "Ahmed", "Malik", "Sheikh", "Raza", "Hussain", "Butt", "Chaudhry", "Qureshi", "Siddiqui",
    "Baig", "Javed", "Iqbal", "Akhtar", "Farooq", "Nawaz", "Aslam", "Shah", "Abbasi", "Ansari",
    "Smith", "Johnson", "Lee", "Brown", "Garcia", "Martin", "Davis", "Wilson", "Clark", "Walker",
]

BIOS = [
    "Love sharing what I know and picking up new skills.",
    "Lifelong learner — always up for a good skill swap.",
    "Teaching is the best way to learn twice.",
    "Here to trade skills, not money.",
    "Passionate about community learning.",
    "Student by day, mentor by evening.",
    "Trying to master something new every month.",
    "Happy to help beginners get started.",
]

BULK_DOMAIN = "@skillswap.dev"


def seed_bulk(db, target_users: int = 600, seed: int = 42):
    """Create a large realistic user base so every skill has teachers and
    learners. Idempotent: skips if the bulk population already exists.
    Bulk users all share the password 'demo123' and *@skillswap.dev emails."""
    import random

    rng = random.Random(seed)

    existing_bulk = db.query(User).filter(User.email.like(f"%{BULK_DOMAIN}")).count()
    if existing_bulk >= target_users:
        return {"created_users": 0, "total_bulk_users": existing_bulk}

    # 1. Make sure the full skill catalog exists.
    existing_skills = {s.name.lower(): s for s in db.query(Skill).all()}
    skills = []
    for name, cat in FULL_SKILL_CATALOG:
        skill = existing_skills.get(name.lower())
        if not skill:
            skill = Skill(name=name, category=cat, moderation_status="approved")
            db.add(skill)
            db.flush()
            existing_skills[name.lower()] = skill
        skills.append(skill)

    # 2. Create users with random teach/learn skill sets.
    password = hash_password("demo123")
    taken_emails = {e for (e,) in db.query(User.email).all()}
    created = 0
    attempt = 0
    users = []
    while created < (target_users - existing_bulk) and attempt < target_users * 20:
        attempt += 1
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        email = f"{first.lower()}.{last.lower()}{rng.randint(1, 9999)}{BULK_DOMAIN}"
        if email in taken_emails:
            continue
        taken_emails.add(email)

        xp = rng.randint(0, 450)
        user = User(
            name=f"{first} {last}",
            email=email,
            password_hash=password,
            bio=rng.choice(BIOS),
            points_balance=rng.randint(80, 500),
            xp=xp,
            level=1 + xp // 100,
            streak=rng.choice([0, 0, 0, 1, 2, 3, 5, 7, 10]),
            status="active",
            onboarding_complete=True,
            has_seen_welcome_popup=True,
            availability=rng.choice(["flexible", "weekdays", "weekends"]),
        )
        db.add(user)
        users.append(user)
        created += 1
    db.flush()

    for user in users:
        teach = rng.sample(skills, rng.randint(1, 4))
        learn_pool = [s for s in skills if s not in teach]
        learn = rng.sample(learn_pool, rng.randint(1, 4))
        user.skills_teach.extend(teach)
        user.skills_learn.extend(learn)

    # 3. Coverage pass — every skill gets at least 3 teachers and 3 learners.
    for skill in skills:
        teachers = [u for u in skill.teachers]
        learners = [u for u in skill.learners]
        if len(teachers) < 3:
            for u in rng.sample(users, min(3, len(users))):
                if skill not in u.skills_teach:
                    u.skills_teach.append(skill)
        if len(learners) < 3:
            for u in rng.sample(users, min(3, len(users))):
                if skill not in u.skills_learn and skill not in u.skills_teach:
                    u.skills_learn.append(skill)

    db.commit()
    total = db.query(User).filter(User.email.like(f"%{BULK_DOMAIN}")).count()
    return {"created_users": created, "total_bulk_users": total}

BADGES = [
    ("First Swap", "Completed your first skill swap"),
    ("5-Star Teacher", "Received five 5-star reviews"),
    ("10 Sessions Streak", "Completed 10 sessions in a row"),
]


def seed_admin_demo_data(db):
    """Seed disputes / moderation queue if empty (safe on existing DBs)."""
    if db.query(Dispute).count() == 0:
        users = db.query(User).filter(User.role != "admin").limit(3).all()
        if len(users) >= 2:
            db.add(Dispute(
                reporter_id=users[0].id,
                accused_id=users[1].id,
                skill_name="Video Editing",
                complaint="Session was cancelled last-minute and points were not refunded.",
                status="open",
            ))
            if len(users) >= 3:
                db.add(Dispute(
                    reporter_id=users[1].id,
                    accused_id=users[2].id,
                    skill_name="Photography",
                    complaint="User shared inappropriate content during the swap chat.",
                    status="open",
                ))

    if db.query(SkillModeration).count() == 0:
        users = db.query(User).filter(User.role != "admin").limit(2).all()
        if users:
            db.add(SkillModeration(
                user_id=users[0].id,
                skill_name="Advanced Figma Prototyping",
                category="Design",
                status="pending",
            ))
            db.add(SkillModeration(
                user_id=users[-1].id,
                skill_name="Spam Skill XYZ",
                category="General",
                status="pending",
                flagged=True,
            ))

    admin = db.query(User).filter_by(email="admin@skillswap.io").first()
    if admin and not admin.password_hash:
        admin.password_hash = hash_password("admin123")
        admin.status = "active"


def seed_database():
    init_db()
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            seed_admin_demo_data(db)
            db.commit()
            return

        skills = {}
        for name, cat in SKILL_CATALOG:
            s = Skill(name=name, category=cat, moderation_status="approved")
            db.add(s)
            db.flush()
            skills[name] = s

        demo_password = hash_password("demo123")
        admin_password = hash_password("admin123")

        demo = User(
            name="Muhammad",
            email="demo@skillswap.io",
            password_hash=demo_password,
            bio="Love teaching web dev and learning design.",
            points_balance=200,
            xp=450,
            level=3,
            streak=5,
            status="verified",
            onboarding_complete=True,
            has_seen_welcome_popup=True,
        )
        roman = User(
            name="Roman",
            email="roman@skillswap.io",
            password_hash=demo_password,
            bio="Video editor & motion designer",
            onboarding_complete=True,
            points_balance=180,
            status="active",
            has_seen_welcome_popup=True,
        )
        arunima = User(
            name="Arunima",
            email="arunima@skillswap.io",
            password_hash=demo_password,
            bio="Photographer learning React",
            onboarding_complete=True,
            points_balance=150,
            status="active",
            has_seen_welcome_popup=True,
        )
        admin = User(
            name="Admin",
            email="admin@skillswap.io",
            password_hash=admin_password,
            role="admin",
            status="active",
            onboarding_complete=True,
            points_balance=999,
            has_seen_welcome_popup=True,
        )
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
        seed_admin_demo_data(db)
        db.commit()
    finally:
        db.close()

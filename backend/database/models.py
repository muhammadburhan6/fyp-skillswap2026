from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from config import Config

engine = create_engine(
    Config.SQLALCHEMY_DATABASE_URI,
    echo=False,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


user_skill_teach = Table(
    "user_skill_teach",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
)

user_skill_learn = Table(
    "user_skill_learn",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("skill_id", Integer, ForeignKey("skills.id"), primary_key=True),
)

conversation_participants = Table(
    "conversation_participants",
    Base.metadata,
    Column("conversation_id", Integer, ForeignKey("conversations.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    bio = Column(Text, default="")
    avatar_url = Column(String(512), default="")
    points_balance = Column(Integer, default=200)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak = Column(Integer, default=0)
    role = Column(String(20), default="user")
    onboarding_complete = Column(Boolean, default=False)
    availability = Column(String(120), default="flexible")
    is_online = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    skills_teach = relationship("Skill", secondary=user_skill_teach, backref="teachers")
    skills_learn = relationship("Skill", secondary=user_skill_learn, backref="learners")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), unique=True, nullable=False)
    category = Column(String(80), default="General")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    user_a_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_b_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_score = Column(Float, default=0)
    status = Column(String(30), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    last_message_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    participants = relationship("User", secondary=conversation_participants, backref="conversations")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    msg_type = Column(String(20), default="text")
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    learner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String(30), default="scheduled")
    points_cost = Column(Integer, default=10)
    meeting_link = Column(String(512), default="")
    # AI-generated learning path stored as a JSON string (see routes/sessions.py).
    learning_path = Column(Text, nullable=True)
    learning_path_mode = Column(String(20), nullable=True)
    learning_path_generated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    reviewee_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer, default=5)
    comment = Column(Text, default="")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True)
    description = Column(String(255), default="")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    badge_id = Column(Integer, ForeignKey("badges.id"))
    earned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String(50))
    payload = Column(Text, default="{}")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PointsTransaction(Base):
    __tablename__ = "points_transactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Integer, nullable=False)
    reason = Column(String(120))
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    subscribed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def migrate_schema():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    if "password_hash" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))

    if "sessions" in inspector.get_table_names():
        session_cols = {col["name"] for col in inspector.get_columns("sessions")}
        with engine.begin() as conn:
            if "learning_path" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN learning_path TEXT"))
            if "learning_path_mode" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN learning_path_mode VARCHAR(20)"))
            if "learning_path_generated_at" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN learning_path_generated_at DATETIME"))


def init_db():
    migrate_schema()
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

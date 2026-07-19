from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from config import Config


def _ensure_sqlite_dir(uri: str) -> None:
    """Create the parent folder for a file-based SQLite DB so a mounted
    persistent volume path (e.g. sqlite:////data/skillswap.db) works."""
    prefix = "sqlite:///"
    if not uri.startswith(prefix):
        return
    path = uri[len(prefix):]
    if not path or path == ":memory:":
        return
    import os

    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)


_ensure_sqlite_dir(Config.SQLALCHEMY_DATABASE_URI)

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
    # active | verified | suspended | banned
    status = Column(String(20), default="active")
    onboarding_complete = Column(Boolean, default=False)
    has_seen_welcome_popup = Column(Boolean, default=False)
    last_daily_bonus_at = Column(DateTime, nullable=True)
    last_daily_bonus_date = Column(Date, nullable=True)  # legacy / calendar day mirror
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
    # approved | pending | rejected | flagged
    moderation_status = Column(String(20), default="approved")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    accused_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_name = Column(String(120), default="")
    complaint = Column(Text, nullable=False, default="")
    # open | warned | banned | resolved
    status = Column(String(30), default="open")
    admin_notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)


class SkillModeration(Base):
    __tablename__ = "skill_moderations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_name = Column(String(120), nullable=False)
    category = Column(String(80), default="General")
    # pending | approved | rejected | removed | shadowbanned
    status = Column(String(30), default="pending")
    reason = Column(Text, default="")
    flagged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
    content = Column(Text, nullable=False, default="")
    msg_type = Column(String(20), default="text")  # text | image | file
    attachment_url = Column(String(512), nullable=True)
    attachment_name = Column(String(255), nullable=True)
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
    # swap | paid
    session_type = Column(String(10), default="swap")
    payment_id = Column(Integer, ForeignKey("payment_records.id"), nullable=True)
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


# LMS materials — teacher-owned content visible to accepted/session partners.
class MaterialCollection(Base):
    __tablename__ = "material_collections"
    __table_args__ = (
        UniqueConstraint("owner_id", "skill_id", name="uq_material_collection_owner_skill"),
    )

    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    title = Column(String(200), nullable=False, default="")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items = relationship(
        "MaterialItem",
        back_populates="collection",
        cascade="all, delete-orphan",
        order_by="MaterialItem.sort_order",
    )


class MaterialItem(Base):
    __tablename__ = "material_items"

    id = Column(Integer, primary_key=True)
    collection_id = Column(Integer, ForeignKey("material_collections.id"), nullable=False)
    title = Column(String(200), nullable=False)
    # file | link | note
    item_type = Column(String(20), nullable=False, default="note")
    # draft | published
    visibility = Column(String(20), nullable=False, default="draft")
    body = Column(Text, default="")
    external_url = Column(String(1024), nullable=True)
    file_url = Column(String(512), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_hint = Column(String(40), nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    collection = relationship("MaterialCollection", back_populates="items")


# Paid sessions — teacher rate card and Stripe payment ledger.
class SkillPricing(Base):
    __tablename__ = "skill_pricing"
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_skill_pricing_user_skill"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    price_usd = Column(Float, nullable=False)
    currency = Column(String(3), default="usd")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True)
    learner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), default="usd")
    platform_fee_cents = Column(Integer, default=0)
    teacher_earnings_cents = Column(Integer, default=0)
    stripe_checkout_id = Column(String(255), unique=True, nullable=False)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    # pending | paid | refunded | failed
    status = Column(String(20), default="pending")
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


def migrate_schema():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "password_hash" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
        if "has_seen_welcome_popup" not in columns:
            # Existing users should not see the one-time welcome popup.
            conn.execute(text("ALTER TABLE users ADD COLUMN has_seen_welcome_popup BOOLEAN DEFAULT 1"))
        if "last_daily_bonus_at" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_daily_bonus_at DATETIME"))
        # Keep legacy date column if present; new code uses last_daily_bonus_at
        if "last_daily_bonus_date" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_daily_bonus_date DATE"))
        if "status" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'"))

    if "skills" in inspector.get_table_names():
        skill_cols = {col["name"] for col in inspector.get_columns("skills")}
        with engine.begin() as conn:
            if "moderation_status" not in skill_cols:
                conn.execute(text("ALTER TABLE skills ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'approved'"))

    if "sessions" in inspector.get_table_names():
        session_cols = {col["name"] for col in inspector.get_columns("sessions")}
        with engine.begin() as conn:
            if "learning_path" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN learning_path TEXT"))
            if "learning_path_mode" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN learning_path_mode VARCHAR(20)"))
            if "learning_path_generated_at" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN learning_path_generated_at DATETIME"))
            if "session_type" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN session_type VARCHAR(10) DEFAULT 'swap'"))
            if "payment_id" not in session_cols:
                conn.execute(text("ALTER TABLE sessions ADD COLUMN payment_id INTEGER"))

    if "messages" in inspector.get_table_names():
        msg_cols = {col["name"] for col in inspector.get_columns("messages")}
        with engine.begin() as conn:
            if "attachment_url" not in msg_cols:
                conn.execute(text("ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(512)"))
            if "attachment_name" not in msg_cols:
                conn.execute(text("ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(255)"))


def init_db():
    migrate_schema()
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

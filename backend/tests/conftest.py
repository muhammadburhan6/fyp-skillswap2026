"""Pytest fixtures for the SkillSwap backend.

Sets up an isolated SQLite database and a secure secret key *before* importing
the app, so the real dev database and config are never touched by tests.
"""

import os
import pathlib
import sys
import tempfile

# Point the app at a throwaway SQLite file and a real secret key BEFORE any
# app module (which reads env at import time) is imported.
_TMP_DIR = tempfile.mkdtemp(prefix="skillswap_test_")
_DB_PATH = pathlib.Path(_TMP_DIR, "test.db").as_posix()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ.setdefault("SECRET_KEY", "test-secret-key-0123456789abcdef0123456789abcdef")
os.environ.setdefault("FLASK_DEBUG", "1")

# Ensure the backend package root is importable (app uses top-level imports).
BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import pytest  # noqa: E402

from app import app as flask_app  # noqa: E402
from database.models import SessionLocal, User  # noqa: E402
from utils.jwt_utils import generate_token  # noqa: E402
from utils.limiter import limiter  # noqa: E402
from utils.passwords import hash_password  # noqa: E402

# Rate limiting would cause false failures when tests hammer auth endpoints.
limiter.enabled = False


@pytest.fixture(scope="session", autouse=True)
def _isolated_outbox(tmp_path_factory):
    """Redirect dev-mode email outbox to a temp dir for the whole test session
    so test emails never land in (or wipe) backend/data/outbox."""
    from pathlib import Path

    from services import email_service
    original = email_service.OUTBOX_DIR
    email_service.OUTBOX_DIR = Path(tmp_path_factory.mktemp("outbox"))
    yield
    email_service.OUTBOX_DIR = original


@pytest.fixture()
def client():
    flask_app.config.update(TESTING=True)
    return flask_app.test_client()


@pytest.fixture()
def make_user():
    """Factory that creates a user directly in the DB and returns (user, token)."""
    created_ids = []

    def _make(email, password="secret123", role="user", **kwargs):
        db = SessionLocal()
        try:
            user = User(
                name=kwargs.pop("name", "Test User"),
                email=email,
                password_hash=hash_password(password),
                role=role,
                **kwargs,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_ids.append(user.id)
            token = generate_token(user.id, user.role)
            # Detach a lightweight view so callers can read attributes after close.
            user_id = user.id
            return {"id": user_id, "email": email, "role": role, "token": token, "password": password}
        finally:
            db.close()

    yield _make

    db = SessionLocal()
    try:
        for uid in created_ids:
            obj = db.get(User, uid)
            if obj:
                db.delete(obj)
        db.commit()
    finally:
        db.close()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

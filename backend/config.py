import os
import warnings
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

_INSECURE_SECRETS = {"", "dev-secret-key", "change-me", "change-me-in-production"}


def _resolve_database_uri() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit

    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    database = os.getenv("MYSQL_DATABASE", "skillswap")

    mysql_uri = (
        f"mysql+pymysql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{database}?charset=utf8mb4"
    )

    try:
        import pymysql

        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            connect_timeout=2,
        )
        conn.close()
        return mysql_uri
    except Exception:
        sqlite_path = BASE_DIR / "skillswap.db"
        print(f"[SkillSwap] MySQL unavailable — using SQLite ({sqlite_path})")
        return f"sqlite:///{sqlite_path}"


def _parse_cors_origins(raw: str):
    """Parse CORS_ORIGINS: '*' stays a wildcard, otherwise split into a list.

    Supports a comma-separated list so a prod URL and Vercel preview URLs can
    all be allowed at once (e.g. "https://app.com,https://app-git-x.vercel.app").
    """
    raw = (raw or "*").strip()
    if raw == "*":
        return "*"
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or "*"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    JWT_ALGORITHM = "HS256"
    JWT_EXPIRY_DAYS = int(os.getenv("JWT_EXPIRY_DAYS", "7"))

    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "skillswap")

    SQLALCHEMY_DATABASE_URI = _resolve_database_uri()

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    # Free-tier AI provider (aistudio.google.com key) used when the paid ones are absent.
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    CORS_ORIGINS = _parse_cors_origins(os.getenv("CORS_ORIGINS", "*"))

    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "SkillSwap <no-reply@skillswap.io>")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Firebase project ID used to verify Google Sign-In ID tokens from the client.
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()

    @classmethod
    def email_enabled(cls) -> bool:
        return bool(cls.SMTP_HOST and cls.SMTP_USER and cls.SMTP_PASSWORD)

    DAILY_HEART_TOKENS = 100
    SESSION_POINT_COST = 10
    TEACH_POINT_REWARD = 15

    @classmethod
    def database_label(cls) -> str:
        if cls.SQLALCHEMY_DATABASE_URI.startswith("mysql"):
            return "mysql"
        if cls.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
            return "sqlite"
        return "database"


if Config.SECRET_KEY in _INSECURE_SECRETS:
    message = (
        "SECRET_KEY is missing or using an insecure default. "
        "Set a strong random SECRET_KEY in backend/.env before deploying. "
        "JWTs signed with a default key are trivially forgeable."
    )
    if not Config.DEBUG:
        raise RuntimeError(message)
    warnings.warn(message, stacklevel=2)

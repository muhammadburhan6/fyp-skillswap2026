# SkillSwap Backend

Flask + Flask-SocketIO + SQLAlchemy API for SkillSwap.

## Setup

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # then edit values
```

Set a strong `SECRET_KEY` in `.env` (JWTs are signed with it). Generate one with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Run

```bash
python app.py        # serves on http://localhost:5000
```

The app uses MySQL when available and automatically falls back to a local SQLite
file (`skillswap.db`) otherwise.

## Authentication

Auth uses signed JWTs (HS256). On `/api/auth/login` and `/api/auth/register` the
API returns a `token`; clients send it as `Authorization: Bearer <token>`.
Socket.IO connections must pass the same token via `auth: { token }`.

## Tests

```bash
pip install -r requirements.txt   # includes pytest
pytest                            # from the backend/ directory
```

Tests run against an isolated temporary SQLite database and never touch the dev
database. Coverage includes auth (login/register), the `require_auth` /
`require_admin` middleware, and wallet ownership checks.

## Environment variables

See `.env.example` for the full list (database, JWT expiry, OpenAI key, SMTP for
password-reset emails, CORS origins, frontend URL).

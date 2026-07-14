# SkillSwap

**A peer-to-peer skill exchange platform — learn anything, teach what you love, no money needed.**

SkillSwap is a Final Year Project (FYP) web application that lets users trade skills using a **points economy** instead of cash. You earn skill points by teaching others and spend them to learn new skills from matched partners. The platform includes AI-assisted matching, real-time chat, session scheduling, and gamification.

**Repository:** [github.com/muhammadburhan6/fyp-skillswap2026](https://github.com/muhammadburhan6/fyp-skillswap2026)

---

## What Problem Does It Solve?

Many students and professionals have valuable skills but cannot afford paid courses or training. Traditional platforms like Udemy or Coursera require payment and do not support direct peer-to-peer exchange. SkillSwap provides a free, community-driven way to learn and teach through skill swaps.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Authentication** | Register, login, JWT auth, forgot/reset password |
| **Onboarding** | Set skills you teach, skills you want to learn, bio, availability |
| **Smart Matching** | Discover partners ranked by complementary skills |
| **AI Recommendations** | OpenAI-powered match ranking and learning paths |
| **Real-Time Chat** | Socket.IO messaging with presence and typing indicators |
| **Sessions & Calendar** | Book, complete, and cancel learning sessions |
| **Skill Points Wallet** | Earn points by teaching, spend them to learn |
| **Progress & Gamification** | XP, levels, streaks, badges, session history |
| **Admin Panel** | Platform stats and user management |
| **SkillBot** | AI assistant for platform help (with keyword fallback) |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite, Tailwind CSS, Zustand, Socket.IO Client, Framer Motion |
| **Backend** | Flask, Flask-SocketIO, SQLAlchemy, PyJWT, Flask-Limiter |
| **Database** | MySQL 8 (Docker) with SQLite fallback |
| **AI** | OpenAI GPT-4o-mini |
| **Deploy** | Render (API), Vercel (frontend) |

---

## Project Structure

```
skillswap/
├── backend/          # Flask API + Socket.IO
│   ├── routes/       # auth, users, matches, sessions, chat, wallet, admin, ai
│   ├── services/     # matching, recommendations, learning paths
│   ├── database/     # SQLAlchemy models
│   └── tests/
├── frontend/         # React SPA
│   └── src/
│       ├── pages/    # Landing, Auth, Dashboard, Discover, Messenger, etc.
│       ├── components/
│       └── store/    # Zustand auth state
├── docs/
├── scripts/
├── docker-compose.yml
└── package.json      # Monorepo scripts (dev, build, db)
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- (Optional) Docker for MySQL

### 1. Clone the repository

```bash
git clone https://github.com/muhammadburhan6/fyp-skillswap2026.git
cd fyp-skillswap2026
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # edit SECRET_KEY, OPENAI_API_KEY if needed
python app.py                  # http://localhost:5000
```

The API auto-detects MySQL; if unavailable it falls back to `skillswap.db` (SQLite).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

### 4. Run both (from project root)

```bash
npm install
npm run dev
```

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@skillswap.io` | `demo123` | Admin |
| `demo@skillswap.io` | `demo123` | User |
| `roman@skillswap.io` | `demo123` | User |
| `arunima@skillswap.io` | `demo123` | User |

---

## Environment Variables

**Backend** (`backend/.env`):

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | JWT signing key (required in production) |
| `OPENAI_API_KEY` | For AI matching and SkillBot (optional; fallbacks exist) |
| `DATABASE_URL` | Override DB connection (optional) |
| `MYSQL_HOST`, `MYSQL_PORT`, etc. | MySQL connection (optional) |

**Frontend** (`frontend/.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (default: `http://localhost:5000/api`) |

---

## Tests

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

CI runs both on push/PR via GitHub Actions.

---

## Deployment

- **Backend:** `render.yaml` — Gunicorn + eventlet on Render
- **Frontend:** `vercel.json` — SPA rewrites on Vercel

---

## FYP Team

| Name | Student ID |
|------|------------|
| Muhammad Burhan Shariq | F2022065310 |
| Muhammad Ibrahim Zahid | F2022065145 |
| Abdul Majeed | F2022065308 |
| Mohsan Raza | F2022065082 |

**Supervisor:** Asma Arshad  
**University:** University of Management and Technology (UMT)  
**Session:** 2022–2026

---

## License

This project was developed as a Final Year Project for academic purposes.

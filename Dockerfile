# Build context = monorepo root (Railway Root Directory empty).
# Forces Python even when package.json would make Railpack detect Node.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SEED_BULK_USERS=0

COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ .

EXPOSE 8080

# Use shell form so $PORT expands. Long timeout for cold starts.
CMD exec gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-8080} --timeout 120 --keep-alive 5 app:app

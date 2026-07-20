# Build context = monorepo root (Railway Root Directory empty).
# Forces Python even when package.json would make Railpack detect Node.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ .

EXPOSE 8080

CMD gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${PORT:-8080} app:app

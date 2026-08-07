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

# Bind/timeouts live in gunicorn.conf.py — the start command must not depend on
# shell expansion, which Railway does not perform.
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]

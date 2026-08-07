"""Gunicorn settings for the Railway deploy.

The bind address is resolved here, in Python, rather than interpolated into the
start command. Railway runs the start command without a shell, so a literal
"$PORT" was reaching gunicorn — every deploy from 2026-07-20 onward died at
boot with "'$PORT' is not a valid port number", leaving the last good container
serving stale code.
"""

import os

bind = f"0.0.0.0:{os.getenv('PORT') or '8080'}"
worker_class = "eventlet"
workers = 1
timeout = 120
keepalive = 5

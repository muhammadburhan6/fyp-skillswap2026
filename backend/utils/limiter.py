"""Shared Flask-Limiter instance.

Kept in its own module so route blueprints can import and decorate handlers
without creating a circular import with app.py.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],  # opt-in per route only
    storage_uri="memory://",
)

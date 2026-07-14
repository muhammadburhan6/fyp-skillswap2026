"""Shared OpenAI client helper.

Centralizes the key check and client construction so routes/services don't each
duplicate the init + fallback logic.
"""

import logging

from config import Config

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {"", "your-openai-api-key"}


def is_ai_available() -> bool:
    """True when a real OpenAI key is configured."""
    return Config.OPENAI_API_KEY not in _PLACEHOLDER_KEYS


def get_openai_client():
    """Return an OpenAI client, or None if unavailable or import fails."""
    if not is_ai_available():
        return None
    try:
        from openai import OpenAI

        return OpenAI(api_key=Config.OPENAI_API_KEY)
    except Exception:
        logger.exception("Failed to construct OpenAI client")
        return None

"""Shared Google Gemini client helper.

Gemini is the no-cost AI provider: Google AI Studio issues free API keys
(no card required), so SkillSwap can serve real AI replies without paid
Anthropic/OpenAI credits. Calls run server-side so the key never reaches
the client.
"""

import logging
import os

import requests

from config import Config

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {"", "your-gemini-api-key"}

# gemini-2.5-flash has a generous free tier; override with GEMINI_MODEL if needed.
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _api_key() -> str:
    return getattr(Config, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")


def is_gemini_available() -> bool:
    """True when a real Gemini key is configured."""
    return _api_key() not in _PLACEHOLDER_KEYS


def call_gemini(
    system: str,
    messages: list,
    model: str | None = None,
    max_tokens: int = 1000,
) -> str:
    """Call Gemini generateContent server-side.

    `messages` uses the same shape as the Anthropic helper
    ([{role: "user"|"assistant", content: str}]) and is mapped to Gemini's
    user/model roles so the two providers are drop-in interchangeable.
    """
    key = _api_key()
    if not key or key in _PLACEHOLDER_KEYS:
        raise ValueError("Gemini API key is not configured.")

    model = model or DEFAULT_MODEL

    contents = [
        {
            "role": "model" if m.get("role") == "assistant" else "user",
            "parts": [{"text": str(m.get("content", ""))}],
        }
        for m in messages
    ]
    # Gemini requires the conversation to start with a user turn.
    while contents and contents[0]["role"] == "model":
        contents.pop(0)
    if not contents:
        raise ValueError("Gemini needs at least one user message.")

    generation_config = {"maxOutputTokens": max_tokens}
    if "2.5" in model:
        # Disable thinking on 2.5 models so the token budget goes to the reply.
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}

    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": generation_config,
    }

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            json=payload,
            headers={"x-goog-api-key": key, "content-type": "application/json"},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise ValueError(f"Gemini returned no candidates: {data}")
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts).strip()
        if not text:
            raise ValueError(f"Gemini returned an empty reply: {data}")
        return text
    except Exception:
        logger.exception("Gemini API message generation failed")
        raise

"""Shared Anthropic client helper.

Enables calling the Anthropic messages API server-side using the configured
key, preventing any client-side exposure.
"""

import logging
import os
import requests
import re
import json
from config import Config

logger = logging.getLogger(__name__)

_PLACEHOLDER_KEYS = {"", "your-anthropic-api-key"}


def is_anthropic_available() -> bool:
    """True when a real Anthropic key is configured."""
    key = getattr(Config, "ANTHROPIC_API_KEY", "") or os.getenv("ANTHROPIC_API_KEY", "")
    return key not in _PLACEHOLDER_KEYS


def call_anthropic(
    system: str,
    messages: list,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 1000,
) -> str:
    """Call the Anthropic messages endpoint server-side."""
    key = getattr(Config, "ANTHROPIC_API_KEY", "") or os.getenv("ANTHROPIC_API_KEY", "")
    if not key or key in _PLACEHOLDER_KEYS:
        # Check if we can fallback to OpenAI if Anthropic key is missing
        logger.warning("Anthropic API key is not configured.")
        raise ValueError("Anthropic API key is not configured.")

    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": messages,
    }

    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        res_json = response.json()
        if "content" in res_json and len(res_json["content"]) > 0:
            return res_json["content"][0]["text"].strip()
        else:
            raise ValueError(f"Invalid Anthropic API response format: {res_json}")
    except Exception as e:
        logger.exception("Anthropic API message generation failed")
        raise e


def parse_json_safely(text: str):
    """Clean and parse JSON from the model response, stripping any markdown formatting."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1).strip()
            
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start_obj = cleaned.find("{")
        start_arr = cleaned.find("[")
        start = -1
        end = -1
        
        if start_obj != -1 and (start_arr == -1 or start_obj < start_arr):
            start = start_obj
            end = cleaned.rfind("}")
        elif start_arr != -1:
            start = start_arr
            end = cleaned.rfind("]")
            
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise

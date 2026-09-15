"""
app/ai/llm_client.py

Thin HTTP client for the free-tier LLM call, built on httpx (already in
requirements.txt) rather than a vendor SDK — swapping Gemini for Groq or
OpenRouter later is a matter of changing the URL/payload shape in one
place, not re-architecting the AI track.

Uses Gemini's structured-output mode (response_mime_type: application/json
+ response_schema) so the model is constrained to return exactly the
shape get_assist() expects, rather than hoping it follows instructions
in prose.

Docs: https://ai.google.dev/api (generateContent endpoint)

Retry behavior: retries on transient failures only (429 rate-limited,
500/502/503/504 server errors, network timeouts) with exponential
backoff. Does NOT retry on errors retrying can't fix — 400 (bad
request/schema), 401/403 (bad API key), 404 (wrong/deprecated model
name, like the gemini-2.5-flash deprecation we actually hit) — those
fail immediately since another attempt would just fail the same way.
"""

from __future__ import annotations

import logging
import random
import time

import httpx
from dataclasses import dataclass
from typing import List


logger = logging.getLogger("ai.llm_client")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# Flash-class model — the free tier's workhorse. Pro-class models are
# paid-only as of 2026, so don't default to one here.
DEFAULT_MODEL = "gemini-3.6-flash"

REQUEST_TIMEOUT_SECONDS = 20.0

# Retry tuning. Kept modest for now since this call still runs
# synchronously inside the officer's request — once analysis moves to a
# background task at submission time (see service.py), these can be
# made more generous without affecting anyone's wait time.
MAX_RETRIES = 2  # up to 3 total attempts
BASE_BACKOFF_SECONDS = 1.0
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "A short (2-4 sentence) neutral summary of what this document is and does.",
        },
        "flags": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                    "passage": {
                        "type": "string",
                        "description": "The exact excerpt from the document that triggered this flag.",
                    },
                    "rule_id": {
                        "type": "string",
                        "description": "The id of the retrieved rule this passage conflicts with. Must be one of the provided rule ids — never invent one.",
                    },
                    "reason": {
                        "type": "string",
                        "description": "One sentence explaining why the passage conflicts with the rule.",
                    },
                },
                "required": ["severity", "passage", "rule_id", "reason"],
            },
        },
    },
    "required": ["summary", "flags"],
}


class LLMError(Exception):
    """Raised on any failure calling the LLM — network error, non-2xx
    response, or a response that doesn't match the expected schema —
    after retries (if any) are exhausted. Callers (get_assist) should
    catch this and degrade gracefully rather than letting it bubble up
    as a 500."""


@dataclass
class LLMAssistResult:
    summary: str
    flags: List[dict]  # each: severity, passage, rule_id, reason


def _sleep_backoff(attempt: int) -> None:
    """Exponential backoff with jitter: ~1-1.5s, ~2-2.5s, ~4-4.5s for
    attempt 0, 1, 2 respectively."""
    delay = BASE_BACKOFF_SECONDS * (2 ** attempt) + random.uniform(0, 0.5)
    time.sleep(delay)


def generate_assist(
    prompt: str,
    api_key: str,
    model: str = DEFAULT_MODEL,
    timeout: float = REQUEST_TIMEOUT_SECONDS,
    max_retries: int = MAX_RETRIES,
) -> LLMAssistResult:
    """Call the LLM with `prompt` (already built by prompt.py, already
    containing only masked text) and return the parsed summary + flags.

    Retries on transient failures (429/5xx/timeouts) with exponential
    backoff, up to `max_retries` additional attempts. Raises LLMError
    immediately (no retry) on non-transient failures, and after retries
    are exhausted for transient ones — so the caller can implement the
    "review page still loads, AI unavailable" degraded state instead of
    crashing the request.
    """
    url = f"{GEMINI_BASE_URL}/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "response_schema": _RESPONSE_SCHEMA,
        },
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": api_key}

    resp = None
    for attempt in range(max_retries + 1):
        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=timeout)
        except httpx.HTTPError as e:
            if attempt < max_retries:
                logger.warning(
                    "llm_client: network error on attempt %d/%d: %s — retrying",
                    attempt + 1, max_retries + 1, e,
                )
                _sleep_backoff(attempt)
                continue
            raise LLMError(f"Request to LLM failed after {attempt + 1} attempts: {e}") from e

        if resp.status_code == 200:
            break  # success — fall through to parsing below

        if resp.status_code in RETRYABLE_STATUS_CODES and attempt < max_retries:
            logger.warning(
                "llm_client: transient status %d on attempt %d/%d — retrying",
                resp.status_code, attempt + 1, max_retries + 1,
            )
            _sleep_backoff(attempt)
            continue

        # Non-retryable (400/401/403/404/etc.) or retries exhausted.
        raise LLMError(f"LLM returned status {resp.status_code}: {resp.text[:300]}")

    try:
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, ValueError) as e:
        raise LLMError(f"Unexpected LLM response shape: {e}") from e

    import json as _json

    try:
        parsed = _json.loads(text)
    except _json.JSONDecodeError as e:
        raise LLMError(f"LLM response was not valid JSON despite response_schema: {e}") from e

    if "summary" not in parsed or "flags" not in parsed:
        raise LLMError(f"LLM response missing required fields: {list(parsed.keys())}")

    return LLMAssistResult(summary=parsed["summary"], flags=parsed["flags"])
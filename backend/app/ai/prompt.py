"""
app/ai/prompt.py

Builds the prompt sent to the LLM. Two hard rules from the spec baked in
directly:
  1. The model only ever sees masked text — this function must never be
     called with anything but already-masked text. It doesn't re-check
     that (masking happens earlier, in the router), but the parameter is
     named accordingly as a reminder.
  2. The model does not decide anything — it flags candidate issues for
     a human officer to weigh; the prompt says so explicitly, and
     get_assist() never writes a Review off the back of this response.
"""

from __future__ import annotations

from typing import List
from app.ai.retrieval import RetrievedRule


SYSTEM_PREAMBLE = """You are assisting a human compliance officer at a financial \
advisory firm who is reviewing client-facing material (marketing emails, \
brochures, social posts, meeting notes, proposal letters) before it goes out.

Your job is ONLY to summarize the document and point out passages that may \
conflict with the compliance rules provided to you. You do not approve, \
reject, or decide anything — a human officer makes that call. Never phrase \
output as a decision or recommendation to approve/reject.

Rules for flags:
- Only flag a passage if it conflicts with one of the rules listed below. \
Do not invent rules or cite a rule_id that isn't in the list.
- Every flag must quote the exact passage from the document that triggered it.
- Every flag must include a one-sentence reason explaining the conflict.
- If no rules are provided, or the document raises no issues against the \
provided rules, return an empty flags list — do not flag stylistic or \
subjective concerns unrelated to the provided rules.
- The document text below has already had personal information replaced \
with placeholders like [CLIENT_1], [ACCOUNT_1], [EMAIL_1]. Treat these as \
opaque references to a real person/account — do not comment on the masking \
itself, and feel free to reference placeholders in your passage quotes and \
reasons exactly as they appear."""


def build_prompt(masked_text: str, rules: List[RetrievedRule]) -> str:
    if rules:
        rules_block = "\n".join(f"- id={r.rule_id}: {r.rule_text}" for r in rules)
    else:
        rules_block = "(No rules were retrieved for this document. Return an empty flags list.)"

    return (
        f"{SYSTEM_PREAMBLE}\n\n"
        f"--- COMPLIANCE RULES ---\n{rules_block}\n\n"
        f"--- DOCUMENT TEXT (masked) ---\n{masked_text}\n\n"
        f"Respond with the summary and flags as instructed."
    )

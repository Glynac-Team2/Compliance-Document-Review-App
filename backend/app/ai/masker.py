"""
PII masker — server-side text masking applied before any document text
leaves the app to a third-party LLM/embedding vendor.

Design notes (per the project brief):
- This is a code-level transform, not a prompt instruction. The vendor
  never sees an unmasked payload.
- Placeholders are STABLE per document: the same real value always maps
  to the same placeholder within one masking pass, so the model's output
  (which references placeholders) can be reliably unmasked for display.
- The mapping (placeholder -> original value) is returned to the caller
  and must be stored server-side only (see PIIMapping model) — never
  sent to the vendor, never embedded.
- This is intentionally regex/heuristic-based, not a production-grade
  PII detector (out of scope per spec). Known gaps are documented at
  the bottom of this file — knowing where it fails matters more than
  chasing every edge case.

Usage:
    masker = PIIMasker()
    masked_text, mapping = masker.mask(raw_text)
    # masked_text -> sent to LLM / embedded
    # mapping     -> stored server-side, used to unmask model output for display
    ...
    display_text = masker.unmask(model_output_text, mapping)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------
# Ordering matters: more specific / higher-risk patterns run first so a
# generic pattern doesn't gobble part of a more specific match first
# (e.g. SSN before generic digit-heavy "account number").

EMAIL_RE = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)

# US phone numbers: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567
# Separators are REQUIRED (not optional) so a bare 10-digit run (e.g. an
# account number with no formatting) isn't misread as a phone number —
# that's ACCOUNT_NUMBER_RE's job instead.
PHONE_RE = re.compile(
    r"(?<!\d)(?:\+?1[-.\s])?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)"
)

# SSN: 123-45-6789 (strict format, checked before generic account numbers)
SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

# Generic account/routing-style numbers: 8-17 digits, optionally grouped
# with spaces/dashes. Deliberately broad — false positives here are safer
# than false negatives for a compliance masker. Anchored to always END on
# a digit (not a separator) so a trailing space/dash after the number
# isn't swallowed into the match.
ACCOUNT_NUMBER_RE = re.compile(r"\b\d(?:[ -]?\d){7,16}\b")

# Street addresses: "123 Main St", "4500 Elm Avenue, Suite 200"
ADDRESS_RE = re.compile(
    r"\b\d{1,6}\s+[A-Z][A-Za-z0-9.'-]*(?:\s+[A-Z][A-Za-z0-9.'-]*){0,4}"
    r"\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|"
    r"Court|Ct|Way|Place|Pl|Circle|Cir|Terrace|Ter|Highway|Hwy)\b\.?"
    r"(?:,?\s+(?:Suite|Ste|Apt|Unit|#)\s*\w+)?"
)

# Dollar amounts: $1,000  $1,000.50  $1000
DOLLAR_RE = re.compile(r"\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?")

# Person names: heuristic — two or three capitalized tokens in a row,
# not at the start of a sentence-initial common word, and not matching
# an address street-suffix pattern already consumed above.
# This intentionally over-fires on things like "New York" or "Dear Sir" —
# see "Known limitations" below.
NAME_RE = re.compile(
    r"\b(?:(?:Mr\.|Mrs\.|Ms\.|Dr\.|Mx\.)\s)?"
    r"[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2}\b"
)

# Common non-name capitalized phrases we don't want to mistake for a person.
# Not exhaustive — extend as false positives are found in real usage.
NAME_STOPWORDS = {
    "New York", "Los Angeles", "San Francisco", "United States",
    "New Jersey", "Wall Street", "Main Street", "Social Security",
    "Compliance Officer", "Financial Advisor", "Annual Report",
    "Terms And Conditions", "Privacy Policy",
}

# Common sentence-opening / letter-salutation words that precede a real
# name (e.g. "Dear Jane Doe,"). Without this, the salutation word gets
# swept into the masked span along with the name. Not a privacy issue
# either way (the real name is still masked), but it produces cleaner,
# more legible masked text for the officer's eventual unmasked view and
# a tighter prompt for the LLM.
NAME_LEADING_WORDS = {
    "Dear", "Hi", "Hello", "Thanks", "Thank", "Please", "Regards",
    "Sincerely", "Best", "Kind", "Warm", "Cheers", "Attention",
}


@dataclass
class PIIMapping:
    """Placeholder -> original value, plus a reverse index for masking
    the same value consistently within one document."""
    placeholder_to_value: Dict[str, str] = field(default_factory=dict)
    value_to_placeholder: Dict[str, str] = field(default_factory=dict)

    def get_or_create(self, category: str, value: str) -> str:
        if value in self.value_to_placeholder:
            return self.value_to_placeholder[value]
        n = sum(1 for p in self.placeholder_to_value if p.startswith(f"[{category}_")) + 1
        placeholder = f"[{category}_{n}]"
        self.placeholder_to_value[placeholder] = value
        self.value_to_placeholder[value] = placeholder
        return placeholder

    def to_dict(self) -> Dict[str, str]:
        """Serializable form for storing in the PIIMapping DB table."""
        return dict(self.placeholder_to_value)

    @classmethod
    def from_dict(cls, d: Dict[str, str]) -> "PIIMapping":
        m = cls()
        for placeholder, value in d.items():
            m.placeholder_to_value[placeholder] = value
            m.value_to_placeholder[value] = placeholder
        return m


class PIIMasker:
    """Regex/heuristic PII masker. Not a production-grade detector —
    see 'Known limitations' at the bottom of this file."""

    # Order: most specific/high-confidence first.
    _PATTERNS: List[Tuple[str, re.Pattern]] = [
        ("EMAIL", EMAIL_RE),
        ("SSN", SSN_RE),
        ("PHONE", PHONE_RE),
        ("ADDRESS", ADDRESS_RE),
        ("AMOUNT", DOLLAR_RE),
        ("ACCOUNT", ACCOUNT_NUMBER_RE),
        ("CLIENT", NAME_RE),  # names last — after addresses/amounts are carved out
    ]

    def mask(self, text: str, mapping: PIIMapping | None = None) -> Tuple[str, PIIMapping]:
        """Mask PII in `text`. If `mapping` is passed, placeholders are
        reused for values already seen (useful when masking multiple
        chunks/sections of the same document so [CLIENT_1] stays [CLIENT_1]
        everywhere)."""
        if mapping is None:
            mapping = PIIMapping()

        result = text
        for category, pattern in self._PATTERNS:
            result = self._mask_category(result, category, pattern, mapping)
        return result, mapping

    def _mask_category(
        self, text: str, category: str, pattern: re.Pattern, mapping: PIIMapping
    ) -> str:
        def _replace(m: re.Match) -> str:
            value = m.group(0)
            if category == "CLIENT":
                if value.strip() in NAME_STOPWORDS:
                    return value
                # Split off a leading salutation word ("Dear Jane Doe" ->
                # keep "Dear ", mask "Jane Doe") so it isn't swept into
                # the placeholder along with the real name.
                first_word, sep, rest = value.partition(" ")
                if first_word in NAME_LEADING_WORDS and rest:
                    return first_word + sep + mapping.get_or_create(category, rest)
            if category == "ACCOUNT" and self._looks_like_date_or_id(value):
                return value
            return mapping.get_or_create(category, value)

        return pattern.sub(_replace, text)

    @staticmethod
    def _looks_like_date_or_id(value: str) -> bool:
        """Cheap guard against flagging things like page numbers or short
        digit runs already matched by a more specific pattern. The account
        pattern requires 8+ digits so this mostly matters for edge cases
        with unusual spacing."""
        digits_only = re.sub(r"[ -]", "", value)
        return len(digits_only) < 8

    def unmask(self, text: str, mapping: PIIMapping) -> str:
        """Replace placeholders in model output with real values, for
        display to the compliance officer only. Never call this before
        sending text to the vendor."""
        result = text
        for placeholder, value in mapping.placeholder_to_value.items():
            result = result.replace(placeholder, value)
        return result


# ---------------------------------------------------------------------------
# Known limitations (documented per spec — "honest notes on what it misses")
# ---------------------------------------------------------------------------
# - NAME_RE is a capitalization heuristic. It will miss single-token names,
#   lowercase-written names, and non-Western name formats. It will also
#   over-fire on capitalized multi-word phrases not in NAME_STOPWORDS
#   (e.g. product names, department names) — extend the stopword set as
#   real false positives are found in the seed corpus.
# - ACCOUNT_NUMBER_RE (8-17 digits) will match some non-account numbers
#   (e.g. long reference/ticket IDs). Given the compliance context, we
#   accept over-masking here as the safer failure mode.
# - ADDRESS_RE covers common US street-suffix formats only — no PO boxes,
#   no international address formats, no apartment-only references.
# - Dollar amounts are masked whenever a "$N" pattern appears, per spec
#   ("dollar amounts tied to a named person") — this implementation does
#   not attempt to distinguish person-tied amounts from firm-level or
#   aggregate figures (e.g. "$2M AUM"). That's a reasonable v2 refinement:
#   only mask amounts within N tokens of a masked CLIENT placeholder.
# - This masker operates on plain extracted text. It assumes Data
#   Engineering's extraction step has already turned PDF/DOCX/XLSX into
#   text before this runs.

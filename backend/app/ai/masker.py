"""
PII masker — server-side text masking applied before any document text
leaves the app to a third-party LLM/embedding vendor.

This implements pii_masking_specification.md (repo root, authored by
Fahrrr) — same token categories (EMAIL/PHONE/ACCOUNT/AMOUNT/ADDRESS/CLIENT),
same trigger-word logic for context-sensitive masking (dollar amounts and
names are only masked near a triggering word, not on every match). Two
patterns in the written spec use variable-length regex lookbehind
(alternatives of different lengths inside `(?<=...)`), which Python's
`re` module does not support — `re.compile()` raises
`re.error: look-behind requires fixed-width pattern` on both the 3.4
(dollar amount) and 3.6 (client name) patterns as written. This file
gets the same masking BEHAVIOR (trigger word stays unmasked, only the
value after/around it gets replaced) using match-then-split instead of
lookbehind, which is valid Python and was verified to compile and run.
Worth a heads-up to Fahrrr so the spec doc itself gets corrected too.

Also closes two gaps found while testing against the spec:
- 3.3 Account pattern only matched the abbreviations ACCT/ACC/ACT/NO./#
  immediately before the digits — spelled-out "account number 123..."
  (no abbreviation) fell through unmasked. Added "account" and "acct"
  as case-insensitive triggers alongside the original abbreviations.
- 3.2 Phone pattern has fully optional separators, so a bare digit run
  can be misread as a phone number before the account pattern gets a
  chance at it if ordering isn't careful. Section 5.4's own stated
  order (Account before Phone) already protects against this in
  practice, and that order is preserved here.

Design notes (per the project brief):
- This is a code-level transform, not a prompt instruction. The vendor
  never sees an unmasked payload.
- Placeholders are STABLE per document: the same real value always maps
  to the same placeholder within one masking pass, so the model's output
  (which references placeholders) can be reliably unmasked for display.
- The mapping (placeholder -> original value) is returned to the caller
  and must be stored server-side only (see PIIMapping model) — never
  sent to the vendor, never embedded.

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
# Regex patterns — mirrors pii_masking_specification.md section 3, with the
# lookbehind patterns (3.4, 3.6) rewritten as match-and-split (see module
# docstring) since Python's `re` can't compile variable-width lookbehind.
# ---------------------------------------------------------------------------

# 3.1 Email — identical to spec.
EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b")

# 3.2 Phone — identical to spec (separators fully optional, as written).
PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
)

# 3.3 Account & SSN — spec pattern, PLUS "account"/"acct" spelled out
# (case-insensitive), with an optional "number" between trigger and
# digits, since the abbreviation-only version misses plain "account
# number 123456789" in real prose (the spec's own worked example prose
# style, notably).
ACCOUNT_RE = re.compile(
    r"\b(?:\d{3}-\d{2}-\d{4}"
    r"|(?:ACCT|ACC|ACT|NO\.?|#|account|acct)\s*(?:number\s*)?[:#-]?\s*\d{6,12})\b",
    re.IGNORECASE,
)

# 3.5 Address — spec pattern, with a few common street suffixes added
# (Terrace, Court, Place, Circle, Highway) since the spec's own worked
# example ("742 Evergreen Terrace") doesn't match its own suffix list —
# "Terrace" isn't in it as written.
ADDRESS_RE = re.compile(
    r"\b\d{1,5}\s+[A-Za-z0-9.\s]{2,25}\s+"
    r"(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|"
    r"Terrace|Ter|Court|Ct|Place|Pl|Circle|Cir|Highway|Hwy|"
    r"Suite|Ste|Apt|Apartment|Unit)\b"
    r"(?:,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?"
)

# 3.4 Dollar amount, rewritten from lookbehind to match-and-split.
# Original spec intent: only mask a dollar figure when it's "tied to a
# named person" — signaled by a trigger word/phrase immediately before it
# (balance, portfolio, worth, invested, assets, deposited, withdrew, has,
# holds, owns, value of) OR a trailing phrase right after it ("in his/her/
# their account", "from his/her/their portfolio"). A bare "$10,000 minimum
# investment" with neither trigger is left unmasked, same as the spec
# intends (see spec's Known Limitation #2).
_AMOUNT_TRIGGER_BEFORE = (
    r"\b(?:balance|portfolio|worth|invested|assets|deposited|withdrew|"
    r"has|holds|owns|value of)"
)
_DOLLAR = r"\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?"
_AMOUNT_TRIGGER_AFTER = r"(?:in (?:his|her|their) account|from (?:his|her|their) portfolio)"

AMOUNT_LEADING_RE = re.compile(
    rf"({_AMOUNT_TRIGGER_BEFORE}\s{{1,5}})({_DOLLAR})", re.IGNORECASE
)
AMOUNT_TRAILING_RE = re.compile(
    rf"({_DOLLAR})(\s{{1,5}}{_AMOUNT_TRIGGER_AFTER})", re.IGNORECASE
)

# 3.6 Client name, rewritten from lookbehind to match-and-split.
# Original spec intent: only mask a capitalized name when it directly
# follows a triggering word (Client, Advisor, Investor, Mr./Ms./Mrs./Dr.,
# Dear) — a much narrower, lower-false-positive rule than masking every
# capitalized phrase. Per the spec's own Known Limitation #1, a name with
# no such prefix (e.g. mid-sentence, no title) will NOT be masked — that's
# accepted spec behavior, not a bug introduced here.
_NAME_TRIGGER = r"\b(?:Client|Advisor|Investor|Mr\.|Ms\.|Mrs\.|Dr\.|Dear)"
_NAME = r"[A-Z][a-z]+(?:\s[A-Z][a-z]+)+"

CLIENT_NAME_RE = re.compile(rf"({_NAME_TRIGGER}\s+)({_NAME})")


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
    """Regex/heuristic PII masker implementing pii_masking_specification.md.
    Not a production-grade detector — see 'Known limitations' at the
    bottom of this file (mirrors spec section 5)."""

    def mask(self, text: str, mapping: PIIMapping | None = None) -> Tuple[str, PIIMapping]:
        """Mask PII in `text`. If `mapping` is passed, placeholders are
        reused for values already seen (useful when masking multiple
        chunks/sections of the same document so [CLIENT_1] stays [CLIENT_1]
        everywhere).

        Order follows spec section 5.4: SSN/Account -> Address -> Phone ->
        Email -> Dollar Amount -> Name.
        """
        if mapping is None:
            mapping = PIIMapping()

        result = text
        result = self._mask_simple(result, "ACCOUNT", ACCOUNT_RE, mapping)
        result = self._mask_simple(result, "ADDRESS", ADDRESS_RE, mapping)
        result = self._mask_simple(result, "PHONE", PHONE_RE, mapping)
        result = self._mask_simple(result, "EMAIL", EMAIL_RE, mapping)
        result = self._mask_amount(result, mapping)
        result = self._mask_client_name(result, mapping)
        return result, mapping

    def _mask_simple(self, text: str, category: str, pattern: re.Pattern, mapping: PIIMapping) -> str:
        def _replace(m: re.Match) -> str:
            value = m.group(0)
            if category == "ACCOUNT" and self._looks_like_short_number(value):
                return value
            return mapping.get_or_create(category, value)

        return pattern.sub(_replace, text)

    def _mask_amount(self, text: str, mapping: PIIMapping) -> str:
        # Trigger-before form: "balance $50,000.00" -> "balance [AMOUNT_1]"
        def _replace_leading(m: re.Match) -> str:
            trigger, amount = m.group(1), m.group(2)
            return trigger + mapping.get_or_create("AMOUNT", amount)

        text = AMOUNT_LEADING_RE.sub(_replace_leading, text)

        # Trigger-after form: "$50,000 in his account" -> "[AMOUNT_1] in his account"
        def _replace_trailing(m: re.Match) -> str:
            amount, trigger = m.group(1), m.group(2)
            return mapping.get_or_create("AMOUNT", amount) + trigger

        text = AMOUNT_TRAILING_RE.sub(_replace_trailing, text)
        return text

    def _mask_client_name(self, text: str, mapping: PIIMapping) -> str:
        def _replace(m: re.Match) -> str:
            trigger, name = m.group(1), m.group(2)
            return trigger + mapping.get_or_create("CLIENT", name)

        return CLIENT_NAME_RE.sub(_replace, text)

    @staticmethod
    def _looks_like_short_number(value: str) -> bool:
        """Guard against the SSN alternative firing on something that
        isn't actually 3-2-4 digit shaped (shouldn't happen given the
        pattern, but cheap to double check)."""
        digits_only = re.sub(r"\D", "", value)
        return len(digits_only) < 6

    def unmask(self, text: str, mapping: PIIMapping) -> str:
        """Replace placeholders in model output with real values, for
        display to the compliance officer only. Never call this before
        sending text to the vendor."""
        result = text
        for placeholder, value in mapping.placeholder_to_value.items():
            result = result.replace(placeholder, value)
        return result


# ---------------------------------------------------------------------------
# Known limitations (mirrors pii_masking_specification.md section 5,
# plus gaps found while implementing it)
# ---------------------------------------------------------------------------
# - Client names are only masked when directly preceded by a trigger word
#   (Client, Advisor, Investor, Mr./Ms./Mrs./Dr., Dear). A name with no
#   such prefix, or written in lowercase, will NOT be masked. This is the
#   spec's own documented tradeoff (fewer false positives on ordinary
#   capitalized phrases), not an oversight.
# - Dollar amounts are only masked near a trigger word/phrase. A bare
#   figure with no context ("$10,000 minimum investment") is left
#   unmasked, per spec Known Limitation #2.
# - Informal/fragmented addresses without a standard street suffix
#   ("his flat in Mumbai") are not caught, per spec Known Limitation #3.
# - PHONE_RE has fully optional separators (as written in the spec) —
#   a bare digit run with no ACCT/account keyword nearby could be
#   misread as a phone number rather than left unmasked or caught as an
#   account number. Given account patterns run first in the fixed
#   processing order, this mainly affects digit runs with no account
#   context at all, which end up masked (as PHONE) rather than not
#   masked at all — over-masking, the safer failure mode.
# - This masker operates on plain extracted text. It assumes text
#   extraction (PDF/DOCX/XLSX -> plain text) has already happened before
#   this runs.
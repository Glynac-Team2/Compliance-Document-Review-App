"""
app/ai/retrieval.py

The seam between the AI track and Data Engineering's vector store.
Data Engineering owns chunking, embedding, storage, and the actual
similarity queries. This module defines the interface the AI track's
prompt-building and flag-generation code calls against, plus a stub
implementation so get_assist() works end-to-end (with an honest empty
result) before the real retrieval pipeline lands.

Swap the bodies of these three functions for real vector-store queries.
The function signatures are the contract — build against these from the
AI-track side without waiting on Data Engineering to finish.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List
from sqlalchemy.orm import Session


@dataclass
class RetrievedRule:
    """One rule/disclosure pulled back for a section of the document."""
    rule_id: str
    rule_text: str
    distance: float  # lower = closer match; exact metric is Data Eng's call


@dataclass
class PrecedentMatch:
    """One similar past reviewed document."""
    document_id: str
    distance: float


def retrieve_relevant_rules(masked_text: str, db: Session, top_k: int = 5) -> List[RetrievedRule]:
    """Embed `masked_text` (or its sections) and pull back the rules/
    disclosures that actually apply, per the brief's 'rule retrieval'
    vector-search use case. Every flag the LLM produces should trace back
    to one of these.

    STUB: returns no rules until Data Engineering's embedding + rule
    corpus + similarity query exist. get_assist() handles this gracefully —
    the LLM is instructed to only flag issues it can ground in a
    retrieved rule, so an empty list here means "no flags", not an error.
    """
    return []


def detect_missing_disclosures(masked_text: str, db: Session) -> List[str]:
    """Per the brief's 'missing-disclosure detection by absence': embed
    the firm's approved disclosure/disclaimer texts, and for each one,
    check whether any passage in `masked_text` sits close to it in vector
    space. Returns the list of disclosure names/ids that appear to be
    MISSING (i.e. nothing in the document matched within the
    present-vs-missing threshold Data Engineering tunes).

    STUB: returns no missing disclosures (i.e. assumes nothing is flagged
    as absent) until the disclosure corpus + threshold exist.
    """
    return []


def find_precedents(masked_text: str, db: Session, top_k: int = 3) -> List[PrecedentMatch]:
    """Per the brief's 'precedent search': embed every reviewed document
    alongside its decision, and for a new submission, return the top_k
    most similar past documents.

    STUB: returns no precedents until the precedent index exists.
    """
    return []

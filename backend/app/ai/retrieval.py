"""
app/ai/retrieval.py

Real rule and precedent retrieval, querying Data Engineering's
pgvector-backed tables (ComplianceCorpus, PrecedentIndex).

Embeds queries the SAME way Data Engineering's seed_db.py does (same
model: text-embedding-004, same request shape) so query-time vectors
land in the same embedding space as the seeded corpus — a different
model or method would make cosine similarity meaningless.

Deliberately does NOT import get_embedding from app.seed_db, even
though the logic is identical — that module runs
Base.metadata.create_all(bind=engine) at import time (a real DB
connection attempt on every import), which makes it unsafe to import
from application code or tests. This is a self-contained duplicate;
if Data Engineering changes their embedding call, this needs updating
to match (worth flagging so the embedding call eventually moves to a
shared, side-effect-free module both sides import from).

IMPORTANT — env var mismatch: this reads GEMINI_API_KEY, same as
seed_db.py, which is DIFFERENT from LLM_API_KEY (used everywhere else
in this app, e.g. llm_client.py). Same underlying Gemini API key value
should work for both, but until GEMINI_API_KEY is actually set in the
environment (.env, docker-compose, CI secrets), every function in this
file will fail closed (return an empty list) rather than crash — worth
raising with Data Engineering/DevOps so this only needs configuring
once, not as two variables.

IMPORTANT — PrecedentIndex is NOT linked to this app's real documents
table. Its rows are independent seeded historical examples (see
seed_db.py / seed_precedents.json) with their own decision and
officer_comment baked in — there's no Review row to join against for
a precedent match. PrecedentOut is built directly from the matched
row's own fields.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import List

import httpx
from sqlalchemy.orm import Session

from app.models import ComplianceCorpus, PrecedentIndex

logger = logging.getLogger("ai.retrieval")


def get_embedding(text: str) -> List[float]:
    """Duplicates seed_db.py's embedding call exactly (same model, same
    request shape) — see module docstring for why this isn't imported
    from there directly."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {"model": "models/text-embedding-004", "content": {"parts": [{"text": text}]}}

    response = httpx.post(url, json=payload, timeout=30.0)
    response.raise_for_status()
    data = response.json()
    return data["embedding"]["values"]



@dataclass
class RetrievedRule:
    """One rule/disclosure pulled back for the document being analyzed."""
    rule_id: str
    rule_text: str
    distance: float  # cosine distance — lower means closer match


@dataclass
class PrecedentMatch:
    """One similar past reviewed item from the seeded precedent corpus.
    All display fields come directly from the matched PrecedentIndex
    row — there is no real Document/Review behind these (see module
    docstring)."""
    precedent_id: str
    doc_type: str
    decision: str
    officer_comment: str
    distance: float


def retrieve_relevant_rules(masked_text: str, db: Session, top_k: int = 5) -> List[RetrievedRule]:
    """Embeds masked_text and finds the top_k closest rules/disclosures
    in ComplianceCorpus by cosine distance. Returns [] on any embedding
    or query failure — callers already treat an empty rule list as
    'nothing to flag', not an error, so this fails closed rather than
    raising and breaking the whole assist pipeline over a retrieval
    hiccup."""
    try:
        query_vector = get_embedding(masked_text)
    except Exception:
        logger.exception("retrieval: failed to embed query text for rule retrieval")
        return []

    try:
        distance_expr = ComplianceCorpus.embedding.cosine_distance(query_vector)
        rows = (
            db.query(ComplianceCorpus, distance_expr.label("distance"))
            .order_by(distance_expr)
            .limit(top_k)
            .all()
        )
    except Exception:
        logger.exception("retrieval: ComplianceCorpus query failed")
        return []

    return [
        RetrievedRule(rule_id=row.ComplianceCorpus.id, rule_text=row.ComplianceCorpus.text, distance=row.distance)
        for row in rows
    ]


def _cosine_distance(a: List[float], b: List[float]) -> float:
    """Pure-Python cosine distance — avoids adding numpy as a dependency
    just for this one approximate check."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    return 1 - dot / (norm_a * norm_b + 1e-9)


def detect_missing_disclosures(masked_text: str, db: Session, threshold: float = 0.35) -> List[str]:
    """Checks the firm's disclosure entries (ComplianceCorpus rows with
    category == 'disclosure') against the document and returns the text
    of any that appear to be MISSING — i.e. nothing in the document is
    close to them.

    Approximate by design: compares one whole-document embedding
    against each disclosure's embedding, rather than per-chunk — a
    disclosure buried in an otherwise unrelated long document could be
    diluted enough to look 'missing' when it isn't. Reasonable first
    pass; chunked comparison would be a natural improvement once
    Data Engineering's pipeline chunks documents.
    """
    try:
        doc_vector = get_embedding(masked_text)
    except Exception:
        logger.exception("retrieval: failed to embed document text for disclosure check")
        return []

    try:
        disclosures = db.query(ComplianceCorpus).filter(ComplianceCorpus.category == "disclosure").all()
    except Exception:
        logger.exception("retrieval: ComplianceCorpus disclosure query failed")
        return []

    missing = []
    for d in disclosures:
        distance = _cosine_distance(list(d.embedding), list(doc_vector))
        if distance > threshold:
            missing.append(d.text)

    return missing


def find_precedents(masked_text: str, db: Session, top_k: int = 3) -> List[PrecedentMatch]:
    """Embeds masked_text and finds the top_k closest past-reviewed
    items in PrecedentIndex by cosine distance."""
    try:
        query_vector = get_embedding(masked_text)
    except Exception:
        logger.exception("retrieval: failed to embed query text for precedent search")
        return []

    try:
        distance_expr = PrecedentIndex.embedding.cosine_distance(query_vector)
        rows = (
            db.query(PrecedentIndex, distance_expr.label("distance"))
            .order_by(distance_expr)
            .limit(top_k)
            .all()
        )
    except Exception:
        logger.exception("retrieval: PrecedentIndex query failed")
        return []

    return [
        PrecedentMatch(
            precedent_id=row.PrecedentIndex.id,
            doc_type=row.PrecedentIndex.doc_type,
            decision=row.PrecedentIndex.decision,
            officer_comment=row.PrecedentIndex.officer_comment,
            distance=row.distance,
        )
        for row in rows
    ]
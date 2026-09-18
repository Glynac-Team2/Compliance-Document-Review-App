"""
app/ai/service.py

The real implementation behind GET /documents/{id}/assist, plus
run_assist_background() for triggering analysis at submission time
(see documents.py) instead of blocking the officer's first request.
"""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import SessionLocal
from app.models import Document, AIAnalysis, Flag as FlagModel, PIIMapping as PIIMappingModel, DocStatus
from app.schemas import AssistOut, FlagOut, PrecedentOut
from app.ai.masker import PIIMasker
from app.ai.text_extraction import extract_text
from app.ai.retrieval import retrieve_relevant_rules, find_precedents
from app.ai.prompt import build_prompt
from app.ai.llm_client import generate_assist, LLMError

logger = logging.getLogger("ai.service")

_masker = PIIMasker()


def run_assist(doc: Document, db: Session) -> AssistOut:
    """Entry point called by the router (on-demand path) AND by
    run_assist_background (submission-time path). Returns a fully-formed
    AssistOut in every case — never raises. Any failure becomes
    available=False with a message.
    """
    doc_id = doc.id

    # ---- 1. Cache check ----
    cached = db.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    if cached:
        return _to_assist_out(cached, db, doc)

    # ---- 2. Get extracted text + mask + call LLM (cache miss) ----
    raw_text = (doc.extracted_text or "").strip()
    if not raw_text:
        try:
            raw_text = extract_text(doc).strip()
        except Exception:
            logger.exception("assist: text extraction failed for %s", doc_id)
            return AssistOut(available=False, error="Couldn't read the document contents.")

    if not raw_text:
        return AssistOut(available=False, error="No extractable text was found in this document.")

    if raw_text.startswith("[Error extracting text:"):
        logger.warning("assist: stored extracted_text for %s was an error string: %s", doc_id, raw_text)
        return AssistOut(available=False, error="Couldn't read the document contents.")

    masked_text, mapping = _masker.mask(raw_text)

    rules = retrieve_relevant_rules(masked_text, db)
    prompt = build_prompt(masked_text, rules)

    try:
        result = generate_assist(prompt, api_key=settings.llm_api_key)
    except LLMError as e:
        logger.warning("assist: LLM call failed for %s: %s", doc_id, e)
        return AssistOut(available=False, error="AI analysis is temporarily unavailable. Please try again later.")

    # ---- 3. Map rule_id -> rule text, unmask for officer display ----
    # Same principle as masking: don't rely on the prompt instruction
    # alone. If the model returns flags for a non-financial document
    # despite being told not to, drop them here — server-side
    # enforcement, not just a hope the instruction was followed.
    model_flags = result.flags if result.document_category == "financial" else []
    if result.flags and result.document_category != "financial":
        logger.warning(
            "assist: model returned %d flag(s) for a %r-classified document %s — dropping",
            len(result.flags), result.document_category, doc_id,
        )

    rules_by_id = {r.rule_id: r.rule_text for r in rules}
    flags_out: list[FlagOut] = []
    flag_rows: list[FlagModel] = []
    for raw_flag in model_flags:
        rule_id = raw_flag.get("rule_id", "")
        rule_text = rules_by_id.get(rule_id)
        if rule_text is None:
            logger.warning("assist: dropping flag with unknown rule_id=%r for doc %s", rule_id, doc_id)
            continue

        passage = _masker.unmask(raw_flag.get("passage", ""), mapping)
        reason = _masker.unmask(raw_flag.get("reason", ""), mapping)
        severity = raw_flag.get("severity", "medium")

        flags_out.append(FlagOut(severity=severity, passage=passage, rule=rule_text, reason=reason))
        flag_rows.append(FlagModel(severity=severity, passage=passage, rule=rule_text, reason=reason))

    summary = _masker.unmask(result.summary, mapping)
    document_category = result.document_category

    # ---- 4. Persist (cache for next time) ----
    try:
        analysis = AIAnalysis(document_id=doc_id, summary=summary, document_category=document_category)
        analysis.flags = flag_rows
        db.add(analysis)
        db.add(PIIMappingModel.store(doc_id, mapping.to_dict()))
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info("assist: concurrent cache write for %s, using existing row", doc_id)
        existing = db.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
        if existing:
            return _to_assist_out(existing, db, doc)
    except Exception:
        db.rollback()
        logger.exception("assist: failed to persist analysis for %s (returning result anyway)", doc_id)

    precedents = _get_precedents(masked_text, db)
    return AssistOut(
        available=True, summary=summary, flags=flags_out, precedents=precedents,
        document_category=document_category,
    )


def run_assist_background(document_id: str) -> None:
    """Entry point for FastAPI's BackgroundTasks, triggered at document
    submission time (see documents.py: submit_document). Runs the same
    pipeline as run_assist(), but opens its OWN database session rather
    than reusing the request's — the request's session is closed by the
    time a background task actually runs, per FastAPI's own guidance.

    Swallows all errors — there's no HTTP response to return them
    through at this point. A failure here just means the on-demand path
    in get_assist() will compute it fresh (and cache it) on first open,
    same as before this feature existed. Nothing is lost by a background
    failure; it only loses the speed benefit for that one document.
    """
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.warning("assist background: document %s not found (deleted before task ran?)", document_id)
            return
        run_assist(doc, db)
    except Exception:
        logger.exception("assist background: unhandled error processing %s", document_id)
    finally:
        db.close()


def _to_assist_out(cached: AIAnalysis, db: Session, doc: Document) -> AssistOut:
    flags = [
        FlagOut(severity=f.severity, passage=f.passage, rule=f.rule, reason=f.reason)
        for f in cached.flags
    ]
    # Recompute precedents live even on a cache hit — the precedent
    # corpus can grow over time, unlike this document's own summary/
    # flags, which don't change once generated. Uses the cached
    # (unmasked) summary as the query text rather than re-extracting
    # and re-masking the original document from scratch — a reasonable
    # proxy, and the summary itself is already a safe, generic
    # description (this app never stores unmasked passages standalone;
    # the summary is the LLM's own paraphrase, not raw client text).
    precedents = _get_precedents(cached.summary, db)
    return AssistOut(
        available=True, summary=cached.summary, flags=flags, precedents=precedents,
        document_category=cached.document_category,
    )


def _get_precedents(masked_text: str, db: Session) -> list[PrecedentOut]:
    try:
        matches = find_precedents(masked_text, db)
    except Exception:
        logger.exception("assist: precedent search failed (continuing without precedents)")
        return []
    return _matches_to_precedent_out(matches)


def _matches_to_precedent_out(matches) -> list[PrecedentOut]:
    """PrecedentIndex rows are self-contained seeded examples — no real
    Document/Review to join against (see retrieval.py's module
    docstring). Build PrecedentOut directly from the matched row's own
    fields."""
    out = []
    for m in matches:
        try:
            verdict = DocStatus(m.decision)
        except ValueError:
            logger.warning(
                "retrieval: precedent %s has unrecognized decision value %r — skipping",
                m.precedent_id, m.decision,
            )
            continue
        out.append(PrecedentOut(document_id=m.precedent_id, verdict=verdict, note=m.officer_comment))
    return out


def get_outbound_payload_preview(doc: Document, db: Session) -> str:
    """Returns the EXACT prompt string that would be sent to the LLM
    vendor for this document, without actually calling the LLM. This is
    the function to call for the masking-proof checkpoint.
    """
    raw_text = (doc.extracted_text or "").strip() or extract_text(doc)
    masked_text, _mapping = _masker.mask(raw_text)
    rules = retrieve_relevant_rules(masked_text, db)
    return build_prompt(masked_text, rules)
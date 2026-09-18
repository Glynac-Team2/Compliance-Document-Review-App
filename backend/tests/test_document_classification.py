"""
Tests for the financial-document classification feature: the LLM now
classifies the document first, and flags should only ever be non-empty
when document_category == "financial". These tests confirm the field
flows through service.py correctly on both the fresh-analysis and
cached paths.

Run with: pytest tests/test_document_classification.py -v
"""

import pytest
from unittest.mock import patch

from app.models import AIAnalysis
from app.ai.service import run_assist
from app.ai.llm_client import LLMAssistResult
from app.ai.retrieval import RetrievedRule

# Reuses _make_user / _make_document helpers from test_service.py's pattern
from tests.test_service import _make_user, _make_document

FAKE_RULES = [RetrievedRule("R-TEST-01", "Must not guarantee a specific return.", 0.0)]


class TestDocumentClassification:
    def test_financial_document_category_flows_through(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "The client has a guaranteed 12% return.")

        fake_result = LLMAssistResult(
            document_category="financial",
            summary="A marketing document about a fund.",
            flags=[{"severity": "high", "passage": "guaranteed 12% return", "rule_id": "R-TEST-01", "reason": "Guarantees a return."}],
        )
        with patch("app.ai.service.generate_assist", return_value=fake_result), \
             patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES):
            result = run_assist(doc, db_session)

        assert result.document_category == "financial"
        assert len(result.flags) == 1

    def test_non_financial_document_has_no_flags(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Please review the updated PTO policy.")

        fake_result = LLMAssistResult(
            document_category="non-financial",
            summary="This appears to be an internal HR policy document, not client-facing financial material.",
            flags=[],  # model correctly returns no flags
        )
        with patch("app.ai.service.generate_assist", return_value=fake_result), \
             patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES):
            result = run_assist(doc, db_session)

        assert result.document_category == "non-financial"
        assert result.flags == []
        assert "HR policy" in result.summary

    def test_other_category_also_produces_no_flags(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some ambiguous short text.")

        fake_result = LLMAssistResult(document_category="other", summary="Unclear document type.", flags=[])
        with patch("app.ai.service.generate_assist", return_value=fake_result), \
             patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES):
            result = run_assist(doc, db_session)

        assert result.document_category == "other"
        assert result.flags == []

    def test_category_persists_and_returns_on_cache_hit(self, db_session):
        """The category has to survive a cache hit too, not just the
        first-run path — this is the part most likely to be missed."""
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some document text.")

        cached = AIAnalysis(document_id=doc.id, summary="Cached summary.", document_category="non-financial")
        db_session.add(cached)
        db_session.commit()

        with patch("app.ai.service.generate_assist") as mock_llm:
            result = run_assist(doc, db_session)

        mock_llm.assert_not_called()  # cache hit, no LLM call
        assert result.document_category == "non-financial"

    def test_flags_are_dropped_server_side_if_model_misbehaves(self, db_session):
        """Same principle as the masking guarantee: don't just trust the
        prompt instruction. Even if the model returns flags alongside a
        non-financial classification, the server strips them — this is
        enforced in code, not just hoped for via the prompt."""
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some text.")

        fake_result = LLMAssistResult(
            document_category="non-financial",
            summary="An HR document.",
            flags=[{"severity": "low", "passage": "p", "rule_id": "R-TEST-01", "reason": "r"}],  # model misbehaved
        )
        with patch("app.ai.service.generate_assist", return_value=fake_result), \
             patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES):
            result = run_assist(doc, db_session)

        # Server-side enforcement strips this regardless of what the model returned.
        assert result.flags == []
        assert result.document_category == "non-financial"
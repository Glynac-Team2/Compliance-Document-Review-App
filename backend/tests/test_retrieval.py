"""
Tests for app/ai/retrieval.py. Mocks get_embedding (no real Gemini call)
and the db.query chain (pgvector's cosine_distance() compiles to
Postgres-specific SQL that doesn't run against SQLite, so these tests
verify the QUERY-BUILDING and RESULT-TRANSFORMATION logic, not real
end-to-end pgvector execution — that needs a real Postgres integration
test, ideally run in CI against the docker-compose Postgres service).
"""

import pytest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace

from app.ai.retrieval import (
    retrieve_relevant_rules,
    find_precedents,
    detect_missing_disclosures,
    _cosine_distance,
)


FAKE_VECTOR = [0.1] * 768


def make_row(obj, distance):
    """Mimics the (ModelInstance, distance) tuple SQLAlchemy returns
    when querying db.query(Model, distance_expr.label('distance'))."""
    row = MagicMock()
    row.distance = distance
    # Set the attribute matching the model's class name, as SQLAlchemy does
    setattr(row, type(obj).__name__, obj)
    return row


class TestRetrieveRelevantRules:
    def test_returns_rules_ordered_by_distance(self):
        from app.models import ComplianceCorpus

        rule1 = ComplianceCorpus(id="R-1", category="rule", text="Rule one text")
        rule2 = ComplianceCorpus(id="R-2", category="rule", text="Rule two text")

        mock_db = MagicMock()
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = [
            make_row(rule1, 0.1),
            make_row(rule2, 0.3),
        ]

        with patch("app.ai.retrieval.get_embedding", return_value=FAKE_VECTOR) as mock_embed:
            rules = retrieve_relevant_rules("masked document text", mock_db, top_k=5)

        mock_embed.assert_called_once_with("masked document text")
        assert len(rules) == 2
        assert rules[0].rule_id == "R-1"
        assert rules[0].rule_text == "Rule one text"
        assert rules[0].distance == 0.1
        assert rules[1].rule_id == "R-2"

    def test_returns_empty_list_on_embedding_failure(self):
        mock_db = MagicMock()
        with patch("app.ai.retrieval.get_embedding", side_effect=ValueError("GEMINI_API_KEY environment variable is not set.")):
            rules = retrieve_relevant_rules("text", mock_db)
        assert rules == []
        mock_db.query.assert_not_called()  # never even tries the query without a vector

    def test_returns_empty_list_on_query_failure(self):
        mock_db = MagicMock()
        mock_db.query.side_effect = Exception("db connection lost")
        with patch("app.ai.retrieval.get_embedding", return_value=FAKE_VECTOR):
            rules = retrieve_relevant_rules("text", mock_db)
        assert rules == []


class TestFindPrecedents:
    def test_returns_precedent_matches_from_own_fields(self):
        """Confirms PrecedentMatch is built entirely from the matched
        row's own fields — no join to a real Document/Review."""
        from app.models import PrecedentIndex

        precedent = PrecedentIndex(
            id="seed-042",
            doc_type="marketing_email",
            masked_text="...",
            decision="rejected",
            officer_comment="Contained an unqualified guarantee.",
        )

        mock_db = MagicMock()
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = [
            make_row(precedent, 0.22),
        ]

        with patch("app.ai.retrieval.get_embedding", return_value=FAKE_VECTOR):
            matches = find_precedents("masked text", mock_db, top_k=3)

        assert len(matches) == 1
        assert matches[0].precedent_id == "seed-042"
        assert matches[0].decision == "rejected"
        assert matches[0].officer_comment == "Contained an unqualified guarantee."
        assert matches[0].distance == 0.22

    def test_returns_empty_list_on_failure(self):
        mock_db = MagicMock()
        with patch("app.ai.retrieval.get_embedding", side_effect=Exception("network error")):
            matches = find_precedents("text", mock_db)
        assert matches == []


class TestCosineDistance:
    def test_identical_vectors_have_zero_distance(self):
        v = [1.0, 2.0, 3.0]
        assert _cosine_distance(v, v) == pytest.approx(0.0, abs=1e-6)

    def test_orthogonal_vectors_have_distance_one(self):
        assert _cosine_distance([1.0, 0.0], [0.0, 1.0]) == pytest.approx(1.0, abs=1e-6)

    def test_opposite_vectors_have_distance_two(self):
        assert _cosine_distance([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(2.0, abs=1e-6)


class TestDetectMissingDisclosures:
    def test_flags_disclosure_as_missing_when_far_from_document(self):
        from app.models import ComplianceCorpus

        disclosure = ComplianceCorpus(
            id="D-1", category="disclosure", text="Past performance does not guarantee future results.",
            embedding=[1.0] * 768,
        )
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.all.return_value = [disclosure]

        # Document embedding orthogonal-ish to the disclosure's -> large distance -> "missing"
        doc_vector = [0.0] * 767 + [1.0]
        with patch("app.ai.retrieval.get_embedding", return_value=doc_vector):
            missing = detect_missing_disclosures("document text", mock_db, threshold=0.35)

        assert disclosure.text in missing

    def test_does_not_flag_disclosure_present_in_document(self):
        from app.models import ComplianceCorpus

        vector = [1.0] * 768
        disclosure = ComplianceCorpus(
            id="D-1", category="disclosure", text="Past performance does not guarantee future results.",
            embedding=vector,
        )
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.all.return_value = [disclosure]

        # Same vector as the disclosure -> distance ~0 -> NOT missing
        with patch("app.ai.retrieval.get_embedding", return_value=vector):
            missing = detect_missing_disclosures("document text", mock_db, threshold=0.35)

        assert missing == []
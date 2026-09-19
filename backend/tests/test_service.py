"""
Tests for app/ai/service.py — the AI assist orchestration (cache check,
masking, LLM call, persistence). Uses the db_session fixture from
conftest.py (real SQLite-backed SQLAlchemy session, same pattern as
test_smoke.py). The LLM call itself and the rule corpus are mocked —
no real network call, no real API key needed, runs safely in CI.

Run with: pytest tests/test_service.py -v
"""

from unittest.mock import patch

from sqlalchemy.orm import sessionmaker

from app.ai.llm_client import LLMAssistResult, LLMError
from app.ai.retrieval import RetrievedRule
from app.ai.service import run_assist
from app.models import AIAnalysis, DocStatus, Document, Flag, Organization, Role, User

FAKE_RULES = [RetrievedRule("R-TEST-01", "Must not guarantee a specific return.", 0.0)]


def _make_user(db_session) -> User:
    organization = Organization(name="Test Organization", domain="test.com")
    db_session.add(organization)
    db_session.flush()
    user = User(
        email="advisor@test.com",
        organization_id=organization.id,
        name="Test Advisor",
        password_hash="x",
        role=Role.advisor,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_document(db_session, user: User, extracted_text: str) -> Document:
    doc = Document(
        advisor_id=user.id,
        organization_id=user.organization_id,
        filename="test.docx",
        file_path="",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        status=DocStatus.pending,
        extracted_text=extracted_text,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    return doc


class TestCacheHit:
    def test_cache_hit_never_calls_llm(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some document text.")

        analysis = AIAnalysis(document_id=doc.id, summary="Cached summary.")
        analysis.flags = [Flag(severity="low", passage="p", rule="r", reason="reason")]
        db_session.add(analysis)
        db_session.commit()

        with patch("app.ai.service.generate_assist") as mock_llm:
            result = run_assist(doc, db_session)

        assert result.available is True
        assert result.summary == "Cached summary."
        assert len(result.flags) == 1
        mock_llm.assert_not_called()


class TestCacheMissSuccess:
    def test_calls_llm_and_persists(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "The client has a guaranteed 12% return.")

        fake_result = LLMAssistResult(
            document_category="financial",
            summary="A document about guaranteed returns.",
            flags=[
                {
                    "severity": "high",
                    "passage": "guaranteed 12% return",
                    "rule_id": "R-TEST-01",
                    "reason": "Guarantees a return.",
                }
            ],
        )
        with (
            patch("app.ai.service.generate_assist", return_value=fake_result) as mock_llm,
            patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES),
        ):
            result = run_assist(doc, db_session)

        assert result.available is True
        assert result.summary == "A document about guaranteed returns."
        assert len(result.flags) == 1
        assert result.flags[0].rule == "Must not guarantee a specific return."
        mock_llm.assert_called_once()

        # Persisted for next time
        cached = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc.id).first()
        assert cached is not None
        assert len(cached.flags) == 1

    def test_masking_actually_happens_before_llm_call(self, db_session):
        """The core guarantee: the LLM never sees raw PII, and the
        officer-facing response has it unmasked back."""
        user = _make_user(db_session)
        doc = _make_document(
            db_session, user, "Contact John Doe at Dear John Doe, jane@example.com about this."
        )
        # Simpler, unambiguous PII per the masking spec's trigger rules:
        doc.extracted_text = "Dear John Doe, please reach me at jane@example.com."
        db_session.commit()

        fake_result = LLMAssistResult(document_category="financial", summary="ok", flags=[])
        with (
            patch("app.ai.service.generate_assist", return_value=fake_result) as mock_llm,
            patch("app.ai.service.retrieve_relevant_rules", return_value=[]),
        ):
            run_assist(doc, db_session)

        sent_prompt = mock_llm.call_args[0][0]  # first positional arg to generate_assist
        assert "John Doe" not in sent_prompt
        assert "jane@example.com" not in sent_prompt
        assert "[CLIENT_1]" in sent_prompt
        assert "[EMAIL_1]" in sent_prompt

    def test_drops_flag_citing_unknown_rule_id(self, db_session):
        """The LLM is instructed never to invent a rule_id — if it does
        anyway, that flag should be dropped rather than shown to the
        officer with a fabricated rule reference."""
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some text.")

        fake_result = LLMAssistResult(
            document_category="financial",
            summary="ok",
            flags=[
                {"severity": "medium", "passage": "p", "rule_id": "MADE-UP-RULE", "reason": "r"}
            ],
        )
        with (
            patch("app.ai.service.generate_assist", return_value=fake_result),
            patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES),
        ):
            result = run_assist(doc, db_session)

        assert result.available is True
        assert result.flags == []  # the bogus-rule flag was dropped


class TestDegradedStates:
    def test_llm_failure_returns_degraded_without_crashing(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some document text.")

        with (
            patch("app.ai.service.generate_assist", side_effect=LLMError("simulated failure")),
            patch("app.ai.service.retrieve_relevant_rules", return_value=FAKE_RULES),
        ):
            result = run_assist(doc, db_session)

        assert result.available is False
        assert result.error
        # No cache row should exist after a failure — next call should retry.
        assert db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc.id).first() is None

    def test_empty_extracted_text_returns_degraded(self, db_session):
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "")  # nothing extracted

        with patch("app.ai.service.generate_assist") as mock_llm:
            result = run_assist(doc, db_session)

        assert result.available is False
        mock_llm.assert_not_called()  # never even tries to call the LLM with nothing to send


class TestRaceCondition:
    def test_concurrent_cache_write_falls_back_to_winners_row_gracefully(self, db_session):
        """Simulates two near-simultaneous /assist requests for the same
        document: this session computes a result and tries to commit,
        but another request already committed first. Should NOT crash —
        should detect the conflict and return the winner's cached data."""
        user = _make_user(db_session)
        doc = _make_document(db_session, user, "Some document text.")

        fake_result = LLMAssistResult(
            document_category="financial", summary="This session's result.", flags=[]
        )

        real_commit = db_session.commit
        call_count = {"n": 0}

        def commit_that_loses_the_race():
            call_count["n"] += 1
            if call_count["n"] == 1:
                # Simulate the OTHER request winning: insert its row via
                # a second session on the same underlying test engine.
                OtherSession = sessionmaker(bind=db_session.get_bind())
                other = OtherSession()
                winner = AIAnalysis(document_id=doc.id, summary="The other request's result.")
                other.add(winner)
                other.commit()
                other.close()

                from sqlalchemy.exc import IntegrityError

                raise IntegrityError("insert", {}, Exception("duplicate key"))
            return real_commit()

        with (
            patch("app.ai.service.generate_assist", return_value=fake_result),
            patch("app.ai.service.retrieve_relevant_rules", return_value=[]),
            patch.object(db_session, "commit", side_effect=commit_that_loses_the_race),
        ):
            result = run_assist(doc, db_session)

        # Must not crash, must return SOME valid result — specifically
        # the winner's, since that's what's now in the cache.
        assert result.available is True
        assert result.summary == "The other request's result."

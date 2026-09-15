"""
Enforces the PII-masking checkpoint automatically, rather than relying
on someone manually running a script. Seeds a document with fake PII
(client name, email, account number, phone, address, dollar amount),
calls the exact function that builds the real outbound LLM payload
(service.get_outbound_payload_preview), and asserts every real value
is absent while its placeholder is present.

This should fail loudly if a future change to the masker, the prompt
builder, or the service's extraction/masking wiring ever reintroduces
a path where raw PII reaches the outbound payload.

Run with: pytest tests/test_masking_payload_proof.py -v
"""

from app.models import User, Document, Role, DocStatus
from app.ai.service import get_outbound_payload_preview


FAKE_DOCUMENT_TEXT = """
Dear Jane Doe,

Thank you for meeting with us last week. As discussed, we recommend
allocating your portfolio into our Growth Fund, which has historically
returned 12% annually.

Your account number 8817263940 has been updated to reflect the new
strategy. Please reach out to jane.doe@example.com or call
(555) 123-4567 with any questions. Your address on file is
789 Maple Avenue, Springfield.

Current balance $250,000 as of today.
"""

REAL_PII_VALUES = [
    "Jane Doe",
    "jane.doe@example.com",
    "8817263940",
    "(555) 123-4567",
    "789 Maple Avenue",
    "$250,000",
]


def _make_document(db_session, extracted_text: str) -> Document:
    user = User(email="advisor@test.com", name="Test Advisor", password_hash="x", role=Role.advisor)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    doc = Document(
        advisor_id=user.id,
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


class TestMaskingPayloadProof:
    def test_seeded_pii_is_absent_from_outbound_payload(self, db_session):
        doc = _make_document(db_session, FAKE_DOCUMENT_TEXT)

        payload = get_outbound_payload_preview(doc, db_session)

        for real_value in REAL_PII_VALUES:
            assert real_value not in payload, (
                f"LEAK: real PII value {real_value!r} was found in the outbound "
                f"LLM payload. This is a critical masking failure."
            )

    def test_placeholders_are_present_in_outbound_payload(self, db_session):
        doc = _make_document(db_session, FAKE_DOCUMENT_TEXT)

        payload = get_outbound_payload_preview(doc, db_session)

        # At least one placeholder per category we seeded should appear —
        # confirms masking actually ran, rather than the text just being
        # coincidentally free of these exact strings.
        for category in ["CLIENT_", "EMAIL_", "ACCOUNT_", "PHONE_", "ADDRESS_", "AMOUNT_"]:
            assert f"[{category}" in payload, (
                f"Expected a [{category}N] placeholder in the outbound payload "
                f"but found none — masking may not have run for this category."
            )

    def test_payload_is_what_would_actually_be_sent(self, db_session):
        """Sanity check that this isn't testing a disconnected code path —
        confirms the masked document text section is actually embedded in
        the same payload structure the real prompt builder produces."""
        doc = _make_document(db_session, FAKE_DOCUMENT_TEXT)

        payload = get_outbound_payload_preview(doc, db_session)

        assert "DOCUMENT TEXT" in payload
        assert "COMPLIANCE RULES" in payload
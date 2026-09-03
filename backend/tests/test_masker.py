"""
Tests for the PII masker, aligned to pii_masking_specification.md.
Run with: pytest backend/tests/test_masker.py -v (from repo root),
or pytest tests/test_masker.py -v (from backend/).
"""

import pytest
from app.ai.masker import PIIMasker


@pytest.fixture
def masker():
    return PIIMasker()


class TestEmail:
    def test_masks_email(self, masker):
        masked, mapping = masker.mask("Contact john.doe@springer.com today.")
        assert "john.doe@springer.com" not in masked
        assert mapping.placeholder_to_value["[EMAIL_1]"] == "john.doe@springer.com"


class TestPhone:
    def test_masks_formatted_phone(self, masker):
        masked, mapping = masker.mask("Call (555) 234-5678 now.")
        assert "(555) 234-5678" not in masked
        assert any(p.startswith("[PHONE_") for p in mapping.placeholder_to_value)


class TestAccountAndSSN:
    def test_masks_ssn_format(self, masker):
        masked, mapping = masker.mask("SSN: 123-45-6789.")
        assert "123-45-6789" not in masked
        assert any(p.startswith("[ACCOUNT_") for p in mapping.placeholder_to_value)

    def test_masks_acct_abbreviation(self, masker):
        masked, mapping = masker.mask("Ref ACCT# 987654321 on file.")
        assert "987654321" not in masked

    def test_masks_spelled_out_account(self, masker):
        # Gap found vs. the written spec: "account number 123..." with no
        # abbreviation. Covered by the added account/acct trigger.
        masked, mapping = masker.mask("Your account number 881726394 was updated.")
        assert "881726394" not in masked
        assert any(p.startswith("[ACCOUNT_") for p in mapping.placeholder_to_value)


class TestAddress:
    def test_masks_full_address(self, masker):
        masked, mapping = masker.mask("Sent to 742 Evergreen Terrace, Springfield, OR 97477.")
        assert "742 Evergreen Terrace" not in masked
        assert any(p.startswith("[ADDRESS_") for p in mapping.placeholder_to_value)


class TestDollarAmount:
    def test_masks_amount_with_leading_trigger(self, masker):
        masked, mapping = masker.mask("Current balance $50,000.00 as of today.")
        assert "$50,000.00" not in masked
        assert "balance [AMOUNT_1]" in masked

    def test_masks_amount_with_trailing_trigger(self, masker):
        masked, mapping = masker.mask("He has $75,000 in his account currently.")
        assert "$75,000" not in masked

    def test_leaves_untriggered_amount_unmasked(self, masker):
        # "has" IS a trigger word, but the spec's trigger-before pattern
        # requires the trigger be followed by ONLY whitespace before the
        # $ sign — an intervening word ("a") breaks the match. So despite
        # "has" being present, this stays unmasked under the literal spec
        # pattern. Documents actual behavior, not a desired outcome either way.
        masked, mapping = masker.mask("The fund has a $10,000 minimum investment.")
        assert "$10,000" in masked

    def test_truly_untriggered_amount_stays_visible(self, masker):
        masked, mapping = masker.mask("The fee schedule lists $10,000 as a tier threshold.")
        assert "$10,000" in masked


class TestClientName:
    def test_masks_name_after_client_trigger(self, masker):
        masked, mapping = masker.mask("Client John Doe requested a review.")
        assert "John Doe" not in masked
        assert "Client [CLIENT_1]" in masked

    def test_masks_name_after_dear(self, masker):
        masked, mapping = masker.mask("Dear Jane Smith, thank you for meeting.")
        assert "Jane Smith" not in masked
        assert "Dear [CLIENT_1]" in masked

    def test_masks_name_after_title(self, masker):
        masked, mapping = masker.mask("Please forward this to Mr. Robert Chen.")
        assert "Robert Chen" not in masked

    def test_leaves_untriggered_name_unmasked(self, masker):
        # Spec's own documented tradeoff: no trigger word -> not masked.
        masked, mapping = masker.mask("John Doe called about his portfolio.")
        assert "John Doe" in masked


class TestUnmask:
    def test_round_trips(self, masker):
        original = "Client Jane Doe (jane@example.com) has $50,000 in his account."
        masked, mapping = masker.mask(original)
        model_output = "Flag: [CLIENT_1] discussed via [EMAIL_1]."
        display = masker.unmask(model_output, mapping)
        assert "Jane Doe" in display
        assert "jane@example.com" in display


class TestRealisticParagraph:
    def test_full_document_masking(self, masker):
        text = (
            "Dear John Smith,\n\n"
            "Thank you for meeting with us. Your account number 8817263940 "
            "has been updated. Current balance $50,000.00 as of today. "
            "Please reach out to john.smith@email.com or call "
            "555-123-4567. Your address on file is 742 Evergreen Terrace, "
            "Springfield, OR 97477."
        )
        masked, mapping = masker.mask(text)

        assert "John Smith" not in masked
        assert "8817263940" not in masked
        assert "$50,000.00" not in masked
        assert "john.smith@email.com" not in masked
        assert "555-123-4567" not in masked
        assert "742 Evergreen Terrace" not in masked

        categories = {p.split("_")[0].strip("[") for p in mapping.placeholder_to_value}
        assert {"CLIENT", "ACCOUNT", "AMOUNT", "EMAIL", "PHONE", "ADDRESS"} <= categories

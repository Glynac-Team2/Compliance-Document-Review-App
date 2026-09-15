"""
Tests for app/ai/llm_client.py — the LLM HTTP client, including retry/
backoff behavior. Everything here mocks httpx.post; no real API key or
network call is ever made, so this runs safely in CI.

Run with: pytest tests/test_llm_client.py -v
"""

import pytest
from unittest.mock import patch, MagicMock

from app.ai.llm_client import generate_assist, LLMError
import app.ai.llm_client as llm_client_module


SUCCESS_BODY = {
    "candidates": [{"content": {"parts": [{"text": '{"summary": "ok", "flags": []}'}]}}]
}


def make_response(status_code, json_body=None, text=""):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    if json_body is not None:
        resp.json.return_value = json_body
    return resp


@pytest.fixture(autouse=True)
def no_real_sleep():
    """Every test in this file patches out the actual backoff sleep so
    the suite runs instantly instead of waiting through real delays."""
    with patch.object(llm_client_module, "_sleep_backoff"):
        yield


class TestSuccess:
    def test_succeeds_on_first_try_no_retry(self):
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(200, SUCCESS_BODY)) as mock_post:
            result = generate_assist("prompt", "fake-key")
            assert result.summary == "ok"
            assert result.flags == []
            assert mock_post.call_count == 1


class TestRetryOnTransientFailures:
    @pytest.mark.parametrize("status", [429, 500, 502, 503, 504])
    def test_retries_then_succeeds(self, status):
        responses = [make_response(status, text="transient"), make_response(200, SUCCESS_BODY)]
        with patch("app.ai.llm_client.httpx.post", side_effect=responses) as mock_post:
            result = generate_assist("prompt", "fake-key")
            assert result.summary == "ok"
            assert mock_post.call_count == 2

    def test_gives_up_after_max_retries(self):
        responses = [make_response(503, text="overloaded")] * 10
        with patch("app.ai.llm_client.httpx.post", side_effect=responses) as mock_post:
            with pytest.raises(LLMError, match="503"):
                generate_assist("prompt", "fake-key", max_retries=2)
            assert mock_post.call_count == 3  # initial + 2 retries

    def test_retries_on_network_error(self):
        import httpx as httpx_module
        responses = [httpx_module.TimeoutException("timed out"), make_response(200, SUCCESS_BODY)]
        with patch("app.ai.llm_client.httpx.post", side_effect=responses) as mock_post:
            result = generate_assist("prompt", "fake-key")
            assert result.summary == "ok"
            assert mock_post.call_count == 2


class TestNoRetryOnNonTransientFailures:
    """These are the cases where retrying can't possibly help — a wrong
    model name or bad credentials will fail identically every time."""

    def test_does_not_retry_on_404(self):
        # This is exactly the gemini-2.5-flash deprecation bug we hit —
        # retrying a 404 for a nonexistent model wastes time and quota
        # for no benefit.
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(404, text="model not found")) as mock_post:
            with pytest.raises(LLMError, match="404"):
                generate_assist("prompt", "fake-key")
            assert mock_post.call_count == 1

    def test_does_not_retry_on_400(self):
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(400, text="bad request")) as mock_post:
            with pytest.raises(LLMError):
                generate_assist("prompt", "fake-key")
            assert mock_post.call_count == 1

    @pytest.mark.parametrize("status", [401, 403])
    def test_does_not_retry_on_auth_errors(self, status):
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(status, text="unauthorized")) as mock_post:
            with pytest.raises(LLMError):
                generate_assist("prompt", "fake-key")
            assert mock_post.call_count == 1


class TestMalformedResponses:
    def test_raises_on_unexpected_response_shape(self):
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(200, {"unexpected": "shape"})):
            with pytest.raises(LLMError, match="Unexpected LLM response shape"):
                generate_assist("prompt", "fake-key")

    def test_raises_on_invalid_json_in_text(self):
        bad_body = {"candidates": [{"content": {"parts": [{"text": "not valid json"}]}}]}
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(200, bad_body)):
            with pytest.raises(LLMError, match="not valid JSON"):
                generate_assist("prompt", "fake-key")

    def test_raises_on_missing_required_fields(self):
        bad_body = {"candidates": [{"content": {"parts": [{"text": '{"summary": "ok"}'}]}}]}  # missing "flags"
        with patch("app.ai.llm_client.httpx.post", return_value=make_response(200, bad_body)):
            with pytest.raises(LLMError, match="missing required fields"):
                generate_assist("prompt", "fake-key")
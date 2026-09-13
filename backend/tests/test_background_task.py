"""
Verifies submit_document() schedules run_assist_background as a
FastAPI BackgroundTask — the actual fix for 'analysis blocks the
officer's request'. Calls the route function directly rather than
through the full HTTP/auth stack, since what's under test is specifically
the background-task scheduling logic, not auth/routing.
"""

import io
import asyncio
from unittest.mock import MagicMock, patch
from fastapi import UploadFile, BackgroundTasks

from app.models import User, Role
from app.routers.documents import submit_document


def make_upload_file(content: bytes, filename: str, content_type: str) -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(content), headers={"content-type": content_type})


def test_schedules_background_analysis_on_submit(db_session):
    user = User(email="a@test.com", name="A", password_hash="x", role=Role.advisor)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    upload = make_upload_file(
        b"Dear Jane Doe, this is a test document.",
        "test.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    background_tasks = BackgroundTasks()

    with patch("app.routers.documents.settings") as mock_settings, \
         patch("app.routers.documents.run_assist_background") as mock_bg:
        # Explicitly set a truthy key — don't rely on ambient environment
        # state (a real .env locally vs. no key at all in CI), which is
        # exactly the bug that slipped through here originally.
        mock_settings.llm_api_key = "fake-key-for-test"
        mock_settings.max_upload_mb = 10
        mock_settings.upload_dir = "/tmp/test-uploads"

        doc = asyncio.run(submit_document(
            background_tasks=background_tasks,
            file=upload,
            revises_id=None,
            user=user,
            db=db_session,
        ))

        # Actually run the scheduled background tasks, same as FastAPI
        # would after sending the response, to confirm the RIGHT function
        # and argument were scheduled.
        asyncio.run(background_tasks())

    mock_bg.assert_called_once_with(doc.id)


def test_does_not_schedule_when_llm_not_configured(db_session):
    user = User(email="b@test.com", name="B", password_hash="x", role=Role.advisor)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    upload = make_upload_file(b"Some text.", "test.docx",
                               "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    background_tasks = BackgroundTasks()

    with patch("app.routers.documents.settings") as mock_settings, \
         patch("app.routers.documents.run_assist_background") as mock_bg:
        mock_settings.llm_api_key = None  # simulate no key configured
        mock_settings.max_upload_mb = 10
        mock_settings.upload_dir = "/tmp/test-uploads"

        asyncio.run(submit_document(
            background_tasks=background_tasks,
            file=upload,
            revises_id=None,
            user=user,
            db=db_session,
        ))
        asyncio.run(background_tasks())

    mock_bg.assert_not_called()
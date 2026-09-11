import io

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AuditAction, AuditEvent, DocStatus


def test_audit_trail(client: TestClient, db_session: Session):
    advisor_token = client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "A",
            "password": "password",
            "role": "advisor",
        },
    ).json()["access_token"]

    r = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": ("test.pdf", io.BytesIO(b"123"), "application/pdf")},
    )
    assert r.status_code == 201
    doc_id = r.json()["id"]

    officer_token = client.post(
        "/auth/signup",
        json={
            "email": "b@x.com",
            "name": "B",
            "password": "password",
            "role": "officer",
        },
    ).json()["access_token"]

    r = client.post(
        f"/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": DocStatus.needs_revision.value, "comment": "..."},
    )
    assert r.status_code == 201

    r = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": ("test-v2.pdf", io.BytesIO(b"456"), "application/pdf")},
        params={"revises_id": doc_id},
    )
    assert r.status_code == 201
    new_doc_id = r.json()["id"]

    original_events = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.document_id == doc_id)
        .order_by(AuditEvent.timestamp)
        .all()
    )

    assert len(original_events) == 2
    assert original_events[0].action == AuditAction.submitted
    assert original_events[1].action == AuditAction.decided

    new_events = (
        db_session.query(AuditEvent).filter(AuditEvent.document_id == new_doc_id).all()
    )

    assert len(new_events) == 1
    assert new_events[0].action == AuditAction.resubmitted

import io

from fastapi.testclient import TestClient

from app.models import DocStatus


def test_revision_thread(client: TestClient):
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

    r = client.get(
        f"/documents/{new_doc_id}",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    thread = r.json()["thread"]

    assert r.status_code == 200
    assert len(thread) == 2
    assert thread[0]["id"] == doc_id
    assert thread[0]["label"] == "Original submission"
    assert thread[1]["id"] == new_doc_id
    assert thread[1]["label"] == "Revision 1 — current"

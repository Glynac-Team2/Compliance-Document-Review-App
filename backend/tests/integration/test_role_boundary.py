from fastapi.testclient import TestClient


def test_advisor_forbidden_from_officer_route(client: TestClient):
    token = client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "A",
            "password": "password",
            "role": "advisor",
        },
    ).json()["access_token"]

    r = client.post(
        "/documents/test-document-123/decision",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 403


def test_officer_forbidden_from_advisor_route(client: TestClient):
    token = client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "A",
            "password": "password",
            "role": "officer",
        },
    ).json()["access_token"]

    r = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 403

from fastapi.testclient import TestClient

from app.models import Role


def test_signup_rejects_empty_password(client: TestClient):
    r = client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "Test Account",
            "password": "",
            "role": Role.advisor,
        },
    )

    assert r.status_code == 422
    assert isinstance(r.json()["detail"], list)
    assert r.json()["detail"][0]["field"] == "password"


def test_signup_rejects_empty_name(client: TestClient):
    r = client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "",
            "password": "password123",
            "role": Role.advisor,
        },
    )

    assert r.status_code == 422
    assert isinstance(r.json()["detail"], list)
    assert r.json()["detail"][0]["field"] == "name"


def test_signup_email_case_insensitive_duplicate(client: TestClient):
    client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "Test Account",
            "password": "password123",
            "role": Role.advisor,
        },
    )

    r = client.post(
        "/auth/signup",
        json={
            "email": "A@X.COM",
            "name": "Test Account",
            "password": "password123",
            "role": Role.advisor,
        },
    )

    assert r.status_code == 400
    assert isinstance(r.json()["detail"], list)
    assert r.json()["detail"][0]["field"] == "email"


def test_login_case_insensitive_email(client: TestClient):
    r1 = client.post(
        "/auth/signup",
        json={
            "email": "MixedCase@X.com",
            "name": "Test Account",
            "password": "password123",
            "role": Role.advisor,
        },
    )

    assert r1.status_code == 201

    r2 = client.post(
        "/auth/login",
        data={
            "username": "MIXEDCASE@X.COM",
            "password": "password123",
        },
    )

    assert r2.status_code == 200
    assert r2.json()["access_token"] is not None

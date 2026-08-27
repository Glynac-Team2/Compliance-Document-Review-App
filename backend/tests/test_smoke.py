def test_client_fixture_works(client):
    r = client.post(
        "/auth/signup",
        json={
            "email": "a@x.com",
            "name": "A",
            "password": "pass1234",
            "role": "advisor",
        },
    )
    assert r.status_code == 201

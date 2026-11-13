def test_patient_register_login_and_refresh_rotation(client):
    registered = client.post("/api/v1/auth/register", json={"email": "new@example.com", "full_name": "New Patient", "password": "long-password-1"})
    assert registered.status_code == 201
    first = registered.json()
    assert first["user"]["role"] == "patient"

    login = client.post("/api/v1/auth/login", json={"email": "new@example.com", "password": "long-password-1"})
    assert login.status_code == 200
    pair = login.json()
    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != pair["refresh_token"]
    rejected = client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert rejected.status_code == 401


def test_invalid_login_is_rejected(client):
    response = client.post("/api/v1/auth/login", json={"email": "missing@example.com", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "http_error"


def test_reserved_test_domain_is_rejected_but_dev_domain_is_valid(client):
    reserved = client.post("/api/v1/auth/login", json={"email": "admin@careslot.test", "password": "anything"})
    accepted_domain = client.post("/api/v1/auth/login", json={"email": "admin@careslot.dev", "password": "anything"})

    assert reserved.status_code == 422
    assert accepted_domain.status_code == 401
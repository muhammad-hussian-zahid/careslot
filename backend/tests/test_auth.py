def test_patient_register_login_and_refresh_rotation(client):
    registered = client.post("/api/v1/auth/register", json={"email": "new@example.com", "full_name": "New Patient", "password": "long-password-1"})
    assert registered.status_code == 201
    first = registered.json()
    assert first["user"]["role"] == "patient"

    login = client.post("/api/v1/auth/login", json={"email": "new@example.com", "password": "long-password-1"})
    assert login.status_code == 200
    pair = login.json()
    rotated = client.post("/api/v1/auth/refresh", params={"refresh_token": pair["refresh_token"]})
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != pair["refresh_token"]
    rejected = client.post("/api/v1/auth/refresh", params={"refresh_token": pair["refresh_token"]})
    assert rejected.status_code == 401


def test_invalid_login_is_rejected(client):
    response = client.post("/api/v1/auth/login", json={"email": "missing@example.com", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "http_error"
from datetime import date, timedelta

from app.core.security import hash_password, issue_token
from app.models import DoctorProfile, User, WeeklyAvailabilityRule


def test_admin_created_doctor_has_available_slots(client, db_session, seeded):
    admin = User(
        email="admin@test.local",
        full_name="Test Admin",
        password_hash=hash_password("admin-password-123"),
        role="admin",
    )
    db_session.add(admin)
    db_session.commit()
    token = issue_token(str(admin.id), "access", timedelta(minutes=15))
    clinic_day = date.today() + timedelta(days=7)

    response = client.post(
        "/api/v1/admin/doctors",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "new.doctor@example.com",
            "full_name": "Dr. New Provider",
            "password": "doctor-password-123",
            "specialty_id": seeded["doctor"].specialty_id,
            "bio": "Primary care",
            "consultation_minutes": 30,
            "availability_rules": [
                {"weekday": clinic_day.weekday(), "start_time": "09:00", "end_time": "12:00"}
            ],
        },
    )

    assert response.status_code == 201
    profile = db_session.get(DoctorProfile, response.json()["id"])
    assert profile is not None
    rules = db_session.query(WeeklyAvailabilityRule).filter_by(doctor_id=profile.id).all()
    assert len(rules) == 1

    slots_response = client.get(f"/api/v1/doctors/{profile.id}/slots?day={clinic_day.isoformat()}")
    assert slots_response.status_code == 200
    assert len(slots_response.json()) == 6


def test_doctor_search_matches_specialty_name(client, seeded):
    response = client.get("/api/v1/doctors?search=Family")

    assert response.status_code == 200
    assert any(doctor["specialty_name"] == "Family Medicine" for doctor in response.json())


def test_admin_can_add_hours_to_existing_doctor(client, db_session, seeded):
    admin = User(
        email="scheduler.admin@test.local",
        full_name="Schedule Admin",
        password_hash=hash_password("admin-password-123"),
        role="admin",
    )
    db_session.add(admin)
    db_session.commit()
    token = issue_token(str(admin.id), "access", timedelta(minutes=15))
    clinic_day = date.today() + timedelta(days=7)

    response = client.put(
        f"/api/v1/admin/doctors/{seeded['doctor'].id}/availability",
        headers={"Authorization": f"Bearer {token}"},
        json=[{"weekday": clinic_day.weekday(), "start_time": "09:00", "end_time": "11:00"}],
    )

    assert response.status_code == 204
    slots_response = client.get(f"/api/v1/doctors/{seeded['doctor'].id}/slots?day={clinic_day.isoformat()}")
    assert slots_response.status_code == 200
    assert len(slots_response.json()) == 4
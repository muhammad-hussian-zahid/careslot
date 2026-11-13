from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models import DoctorProfile, Specialty, User, WeeklyAvailabilityRule
from app.core.security import hash_password


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)
    with TestingSession() as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seeded(db_session: Session) -> dict[str, object]:
    specialty = Specialty(name="Family Medicine", description="Primary care")
    doctor_user = User(email="doctor@test.local", full_name="Dr. Test", password_hash=hash_password("password1234"), role="doctor")
    patient = User(email="patient@test.local", full_name="Patient Test", password_hash=hash_password("password1234"), role="patient")
    db_session.add_all([specialty, doctor_user, patient])
    db_session.flush()
    doctor = DoctorProfile(user_id=doctor_user.id, specialty_id=specialty.id, bio="", consultation_minutes=30)
    db_session.add(doctor)
    db_session.flush()
    from datetime import time

    db_session.add(WeeklyAvailabilityRule(doctor_id=doctor.id, weekday=2, start_time=time(9), end_time=time(12)))
    db_session.commit()
    return {"doctor": doctor, "patient": patient, "doctor_user": doctor_user}
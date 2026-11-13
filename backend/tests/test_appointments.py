from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi import HTTPException

from app.models import Appointment, TimeOff
from app.services.appointments import book_appointment, cancel_appointment
from app.services.slots import available_slots


def next_wednesday() -> date:
    today = date.today()
    return today + timedelta(days=(2 - today.weekday()) % 7 or 7)


def test_slots_subtract_time_off_and_booked_appointments(db_session, seeded):
    doctor = seeded["doctor"]
    patient = seeded["patient"]
    day = next_wednesday()
    starts = datetime.combine(day, time(10), tzinfo=ZoneInfo("Asia/Karachi")).astimezone(UTC)
    db_session.add(TimeOff(doctor_id=doctor.id, starts_at=starts, ends_at=starts + timedelta(minutes=30), reason="Leave"))
    db_session.add(Appointment(doctor_id=doctor.id, patient_id=patient.id, starts_at=starts + timedelta(hours=1), ends_at=starts + timedelta(hours=1, minutes=30), status="confirmed", reason=""))
    db_session.commit()
    slots = available_slots(db_session, doctor, day)
    assert [start.hour for start, _ in slots] == [4, 4, 5, 6]


def test_overlapping_booking_returns_conflict(db_session, seeded):
    doctor = seeded["doctor"]
    patient = seeded["patient"]
    day = next_wednesday()
    starts = datetime.combine(day, time(9), tzinfo=ZoneInfo("Asia/Karachi")).astimezone(UTC)
    book_appointment(db_session, patient, doctor.id, starts, "First")
    with pytest.raises(HTTPException) as error:
        book_appointment(db_session, patient, doctor.id, starts, "Second")
    assert error.value.status_code == 409


def test_patient_cannot_cancel_within_two_hours(db_session, seeded):
    patient = seeded["patient"]
    appointment = Appointment(doctor_id=seeded["doctor"].id, patient_id=patient.id, starts_at=datetime.now(UTC) + timedelta(hours=1), ends_at=datetime.now(UTC) + timedelta(hours=1, minutes=30), status="confirmed", reason="")
    db_session.add(appointment)
    db_session.commit()
    with pytest.raises(HTTPException) as error:
        cancel_appointment(db_session, appointment, patient)
    assert error.value.status_code == 409


def test_patient_can_cancel_more_than_two_hours_ahead(db_session, seeded):
    patient = seeded["patient"]
    starts = datetime.now(UTC) + timedelta(hours=3)
    appointment = Appointment(doctor_id=seeded["doctor"].id, patient_id=patient.id, starts_at=starts, ends_at=starts + timedelta(minutes=30), status="pending", reason="")
    db_session.add(appointment)
    db_session.commit()
    cancel_appointment(db_session, appointment, patient)
    assert appointment.status == "cancelled"
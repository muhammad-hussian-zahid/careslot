from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Appointment, DoctorProfile, User
from app.services.slots import available_slots


def book_appointment(db: Session, patient: User, doctor_id: int, starts_at: datetime, reason: str) -> Appointment:
    if starts_at.tzinfo is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "starts_at must include a timezone")
    doctor = db.get(DoctorProfile, doctor_id)
    if doctor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")
    starts_at = starts_at.astimezone(UTC)
    clinic_date = starts_at.astimezone(ZoneInfo("Asia/Karachi")).date()
    candidate = next((slot for slot in available_slots(db, doctor, clinic_date) if slot[0] == starts_at), None)
    if candidate is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That time slot is no longer available")
    appointment = Appointment(
        doctor_id=doctor.id,
        patient_id=patient.id,
        starts_at=candidate[0],
        ends_at=candidate[1],
        status="pending",
        reason=reason,
    )
    db.add(appointment)
    try:
        db.commit()
        db.refresh(appointment)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That time slot was just booked") from exc
    return appointment


def cancel_appointment(db: Session, appointment: Appointment, user: User) -> Appointment:
    if user.role == "patient":
        if appointment.patient_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
        starts_at = appointment.starts_at
        if starts_at.tzinfo is None:
            starts_at = starts_at.replace(tzinfo=UTC)
        if starts_at - datetime.now(UTC) < timedelta(hours=2):
            raise HTTPException(status.HTTP_409_CONFLICT, "Appointments cannot be cancelled within 2 hours")
    if appointment.status not in ("pending", "confirmed"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Appointment is not active")
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    return appointment


def get_appointment(db: Session, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appointment
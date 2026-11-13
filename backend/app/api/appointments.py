from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Appointment, User
from app.schemas import AppointmentCreate, AppointmentOut
from app.services.appointments import book_appointment, cancel_appointment, get_appointment

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Appointment]:
    query = select(Appointment)
    if user.role == "patient":
        query = query.where(Appointment.patient_id == user.id)
    elif user.role == "doctor":
        query = query.where(Appointment.doctor_id == user.doctor_profile.id)
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    return list(db.scalars(query.order_by(Appointment.starts_at.desc()).offset((page - 1) * page_size).limit(page_size)).all())


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, user: User = Depends(require_roles("patient")), db: Session = Depends(get_db)) -> Appointment:
    return book_appointment(db, user, payload.doctor_id, payload.starts_at, payload.reason)


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Appointment:
    appointment = get_appointment(db, appointment_id)
    if user.role == "doctor" and appointment.doctor_id != user.doctor_profile.id:
        raise HTTPException(404, "Appointment not found")
    return cancel_appointment(db, appointment, user)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentOut)
def reschedule(appointment_id: int, payload: AppointmentCreate, user: User = Depends(require_roles("patient")), db: Session = Depends(get_db)) -> Appointment:
    existing = get_appointment(db, appointment_id)
    if existing.patient_id != user.id:
        raise HTTPException(404, "Appointment not found")
    starts_at = existing.starts_at if existing.starts_at.tzinfo else existing.starts_at.replace(tzinfo=UTC)
    if starts_at - datetime.now(UTC) < __import__("datetime").timedelta(hours=2):
        raise HTTPException(409, "Appointments cannot be rescheduled within 2 hours")
    if existing.status not in ("pending", "confirmed"):
        raise HTTPException(409, "Appointment is not active")
    existing.status = "cancelled"
    db.commit()
    return book_appointment(db, user, payload.doctor_id, payload.starts_at, payload.reason)


@router.get("/admin/all", response_model=list[AppointmentOut])
def all_appointments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> list[Appointment]:
    return list(db.scalars(select(Appointment).order_by(Appointment.starts_at.desc()).offset((page - 1) * page_size).limit(page_size)).all())
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.dependencies import require_roles
from app.models import Appointment, DoctorProfile, Specialty, TimeOff, User, WeeklyAvailabilityRule
from app.schemas import AvailabilityRuleInput, DoctorCreate, SpecialtyCreate, SpecialtyOut, TimeOffInput, TimeOffOut

router = APIRouter(tags=["management"])


@router.get("/doctor/availability", response_model=list[AvailabilityRuleInput])
def get_availability(db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))) -> list[WeeklyAvailabilityRule]:
    profile = user.doctor_profile
    if profile is None:
        raise HTTPException(409, "Doctor profile is missing")
    return list(db.scalars(select(WeeklyAvailabilityRule).where(WeeklyAvailabilityRule.doctor_id == profile.id).order_by(WeeklyAvailabilityRule.weekday, WeeklyAvailabilityRule.start_time)).all())


@router.post("/admin/doctors", status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict[str, int]:
    if db.get(Specialty, payload.specialty_id) is None:
        raise HTTPException(404, "Specialty not found")
    if any(rule.end_time <= rule.start_time for rule in payload.availability_rules):
        raise HTTPException(422, "Availability end time must be after start time")
    user = User(email=payload.email.lower(), full_name=payload.full_name, password_hash=hash_password(payload.password), role="doctor")
    db.add(user)
    try:
        db.flush()
        profile = DoctorProfile(user_id=user.id, specialty_id=payload.specialty_id, bio=payload.bio, consultation_minutes=payload.consultation_minutes)
        db.add(profile)
        db.flush()
        db.add_all([
            WeeklyAvailabilityRule(doctor_id=profile.id, **rule.model_dump())
            for rule in payload.availability_rules
        ])
        db.commit()
        db.refresh(profile)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists") from exc
    return {"id": profile.id, "user_id": user.id}


@router.delete("/admin/doctors/{doctor_id}", status_code=204)
def deactivate_doctor(doctor_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    profile = db.get(DoctorProfile, doctor_id)
    if profile is None:
        raise HTTPException(404, "Doctor not found")
    profile.user.is_active = False
    db.commit()


@router.get("/admin/doctors/{doctor_id}/availability", response_model=list[AvailabilityRuleInput])
def get_doctor_availability(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> list[WeeklyAvailabilityRule]:
    profile = db.get(DoctorProfile, doctor_id)
    if profile is None:
        raise HTTPException(404, "Doctor not found")
    return list(db.scalars(
        select(WeeklyAvailabilityRule)
        .where(WeeklyAvailabilityRule.doctor_id == profile.id)
        .order_by(WeeklyAvailabilityRule.weekday, WeeklyAvailabilityRule.start_time)
    ).all())


@router.put("/admin/doctors/{doctor_id}/availability", status_code=204)
def replace_doctor_availability(
    doctor_id: int,
    rules: list[AvailabilityRuleInput],
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> None:
    profile = db.get(DoctorProfile, doctor_id)
    if profile is None:
        raise HTTPException(404, "Doctor not found")
    if not rules or any(rule.end_time <= rule.start_time for rule in rules):
        raise HTTPException(422, "Choose at least one valid weekly availability period")
    db.query(WeeklyAvailabilityRule).filter(WeeklyAvailabilityRule.doctor_id == profile.id).delete()
    db.add_all([WeeklyAvailabilityRule(doctor_id=profile.id, **rule.model_dump()) for rule in rules])
    db.commit()


@router.post("/admin/specialties", response_model=SpecialtyOut, status_code=201)
def create_specialty(payload: SpecialtyCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> Specialty:
    specialty = Specialty(name=payload.name.strip(), description=payload.description)
    db.add(specialty)
    try:
        db.commit()
        db.refresh(specialty)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Specialty already exists") from exc
    return specialty


@router.delete("/admin/specialties/{specialty_id}", status_code=204)
def delete_specialty(specialty_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> None:
    specialty = db.get(Specialty, specialty_id)
    if specialty is None:
        raise HTTPException(404, "Specialty not found")
    if db.scalar(select(DoctorProfile.id).where(DoctorProfile.specialty_id == specialty_id)) is not None:
        raise HTTPException(409, "Move doctors to another specialty before deleting this one")
    db.delete(specialty)
    db.commit()


@router.put("/doctor/availability", status_code=204)
def replace_availability(rules: list[AvailabilityRuleInput], db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))) -> None:
    profile = user.doctor_profile
    if profile is None:
        raise HTTPException(409, "Doctor profile is missing")
    for rule in rules:
        if rule.end_time <= rule.start_time:
            raise HTTPException(422, "Availability end time must be after start time")
    db.query(WeeklyAvailabilityRule).filter(WeeklyAvailabilityRule.doctor_id == profile.id).delete()
    db.add_all([WeeklyAvailabilityRule(doctor_id=profile.id, **rule.model_dump()) for rule in rules])
    db.commit()


@router.post("/doctor/time-off", status_code=201)
def add_time_off(payload: TimeOffInput, db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))) -> dict[str, int]:
    if payload.starts_at.tzinfo is None or payload.ends_at.tzinfo is None or payload.ends_at <= payload.starts_at:
        raise HTTPException(422, "Time off requires timezone-aware timestamps and a positive duration")
    profile = user.doctor_profile
    if profile is None:
        raise HTTPException(409, "Doctor profile is missing")
    item = TimeOff(doctor_id=profile.id, starts_at=payload.starts_at.astimezone(UTC), ends_at=payload.ends_at.astimezone(UTC), reason=payload.reason)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.get("/doctor/time-off", response_model=list[TimeOffOut])
def get_time_off(db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))) -> list[TimeOff]:
    profile = user.doctor_profile
    if profile is None:
        raise HTTPException(409, "Doctor profile is missing")
    return list(db.scalars(select(TimeOff).where(TimeOff.doctor_id == profile.id).order_by(TimeOff.starts_at)).all())


@router.delete("/doctor/time-off/{time_off_id}", status_code=204)
def delete_time_off(time_off_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))) -> None:
    profile = user.doctor_profile
    item = db.get(TimeOff, time_off_id)
    if item is None or profile is None or item.doctor_id != profile.id:
        raise HTTPException(404, "Time-off block not found")
    db.delete(item)
    db.commit()


@router.patch("/doctor/appointments/{appointment_id}")
def update_appointment_status(appointment_id: int, new_status: str, db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))) -> dict[str, str]:
    if new_status not in {"confirmed", "completed", "no_show", "cancelled"}:
        raise HTTPException(422, "Invalid appointment status")
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or user.doctor_profile is None or appointment.doctor_id != user.doctor_profile.id:
        raise HTTPException(404, "Appointment not found")
    appointment.status = new_status
    db.commit()
    return {"status": new_status}
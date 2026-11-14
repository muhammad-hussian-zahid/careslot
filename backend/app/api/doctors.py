from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import DoctorProfile, Specialty, User
from app.schemas import DoctorOut, SlotOut, SpecialtyOut
from app.services.slots import CLINIC_TIMEZONE, available_slots

router = APIRouter(tags=["doctors"])


def doctor_output(profile: DoctorProfile) -> DoctorOut:
    return DoctorOut(id=profile.id, user_id=profile.user_id, full_name=profile.user.full_name, specialty_id=profile.specialty_id, specialty_name=profile.specialty.name, bio=profile.bio, consultation_minutes=profile.consultation_minutes)


@router.get("/specialties", response_model=list[SpecialtyOut])
def specialties(db: Session = Depends(get_db)) -> list[Specialty]:
    return list(db.scalars(select(Specialty).order_by(Specialty.name)).all())


@router.get("/doctors", response_model=list[DoctorOut])
def doctors(
    specialty_id: int | None = None,
    search: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[DoctorOut]:
    query = select(DoctorProfile).join(DoctorProfile.user).join(DoctorProfile.specialty).where(User.is_active.is_(True))
    if specialty_id is not None:
        query = query.where(DoctorProfile.specialty_id == specialty_id)
    if search:
        normalized_search = search.lower()
        query = query.where(
            or_(
                func.lower(User.full_name).contains(normalized_search),
                func.lower(Specialty.name).contains(normalized_search),
            )
        )
    rows = db.scalars(query.order_by(User.full_name).offset((page - 1) * page_size).limit(page_size)).all()
    return [doctor_output(profile) for profile in rows]


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def doctor_detail(doctor_id: int, db: Session = Depends(get_db)) -> DoctorOut:
    profile = db.scalar(select(DoctorProfile).join(DoctorProfile.user).where(DoctorProfile.id == doctor_id, User.is_active.is_(True)))
    if profile is None:
        raise HTTPException(404, "Doctor not found")
    return doctor_output(profile)


@router.get("/doctors/{doctor_id}/slots", response_model=list[SlotOut])
def doctor_slots(doctor_id: int, day: date, db: Session = Depends(get_db)) -> list[SlotOut]:
    if day < datetime.now(UTC).astimezone(CLINIC_TIMEZONE).date():
        raise HTTPException(422, "Date must not be in the past")
    profile = db.get(DoctorProfile, doctor_id)
    if profile is None:
        raise HTTPException(404, "Doctor not found")
    return [SlotOut(starts_at=start, ends_at=end) for start, end in available_slots(db, profile, day)]
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Appointment, DoctorProfile, TimeOff, WeeklyAvailabilityRule

CLINIC_TIMEZONE = ZoneInfo("Asia/Karachi")
ACTIVE_STATUSES = ("pending", "confirmed")


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def available_slots(db: Session, doctor: DoctorProfile, day: date) -> list[tuple[datetime, datetime]]:
    rules = db.scalars(
        select(WeeklyAvailabilityRule).where(
            WeeklyAvailabilityRule.doctor_id == doctor.id,
            WeeklyAvailabilityRule.weekday == day.weekday(),
        )
    ).all()
    if not rules:
        return []

    local_start = datetime.combine(day, time.min, tzinfo=CLINIC_TIMEZONE).astimezone(UTC)
    local_end = datetime.combine(day + timedelta(days=1), time.min, tzinfo=CLINIC_TIMEZONE).astimezone(UTC)
    time_off = db.scalars(
        select(TimeOff).where(
            TimeOff.doctor_id == doctor.id,
            TimeOff.starts_at < local_end,
            TimeOff.ends_at > local_start,
        )
    ).all()
    booked = db.scalars(
        select(Appointment).where(
            Appointment.doctor_id == doctor.id,
            Appointment.status.in_(ACTIVE_STATUSES),
            Appointment.starts_at < local_end,
            Appointment.ends_at > local_start,
        )
    ).all()
    blocked = [(as_utc(item.starts_at), as_utc(item.ends_at)) for item in [*time_off, *booked]]
    duration = timedelta(minutes=doctor.consultation_minutes)
    slots: list[tuple[datetime, datetime]] = []
    now = datetime.now(UTC)
    for rule in rules:
        cursor = datetime.combine(day, rule.start_time, tzinfo=CLINIC_TIMEZONE)
        finish = datetime.combine(day, rule.end_time, tzinfo=CLINIC_TIMEZONE)
        while cursor + duration <= finish:
            slot_start = cursor.astimezone(UTC)
            slot_end = (cursor + duration).astimezone(UTC)
            if slot_start > now and not any(slot_start < end and slot_end > start for start, end in blocked):
                slots.append((slot_start, slot_end))
            cursor += duration
    return sorted(slots)
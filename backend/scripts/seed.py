from datetime import time
from pathlib import Path
import sys

from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import DoctorProfile, Specialty, User, WeeklyAvailabilityRule

SPECIALTIES = [
    ("Cardiology", "Heart and cardiovascular care"),
    ("Dermatology", "Skin, hair, and nail care"),
    ("Family Medicine", "Primary care for every stage of life"),
    ("Pediatrics", "Medical care for children and adolescents"),
    ("Orthopedics", "Bone, joint, and musculoskeletal care"),
]
DEMO_PASSWORD = "CareSlotDemo!2026"


def seed() -> None:
    with SessionLocal() as db:
        specialties: dict[str, Specialty] = {}
        for name, description in SPECIALTIES:
            specialty = db.scalar(select(Specialty).where(Specialty.name == name))
            if specialty is None:
                specialty = Specialty(name=name, description=description)
                db.add(specialty)
                db.flush()
            specialties[name] = specialty

        accounts = [
            ("admin@careslot.dev", "CareSlot Administrator", "admin"),
            ("doctor@careslot.dev", "Dr. Ayesha Khan", "doctor"),
            ("patient@careslot.dev", "Sara Ahmed", "patient"),
        ]
        users: dict[str, User] = {}
        for email, full_name, role in accounts:
            user = db.scalar(select(User).where(User.email == email))
            legacy_email = email.replace("@careslot.dev", "@careslot.test")
            legacy_user = db.scalar(select(User).where(User.email == legacy_email))
            if user is not None and legacy_user is not None:
                raise RuntimeError(f"Both current and legacy accounts exist for {role}; resolve the duplicate before seeding")
            if user is None and legacy_user is not None:
                user = legacy_user
                user.email = email
            if user is None:
                user = User(email=email, full_name=full_name, role=role, password_hash=hash_password(DEMO_PASSWORD))
                db.add(user)
                db.flush()
            elif user.role != role:
                raise RuntimeError(f"The account for {role} has an unexpected role; resolve it before seeding")
            users[email] = user

        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == users["doctor@careslot.dev"].id))
        if doctor is None:
            doctor = DoctorProfile(user_id=users["doctor@careslot.dev"].id, specialty_id=specialties["Family Medicine"].id, bio="Patient-focused primary care with a practical, thoughtful approach.", consultation_minutes=30)
            db.add(doctor)
            db.flush()
            for weekday in range(5):
                db.add(WeeklyAvailabilityRule(doctor_id=doctor.id, weekday=weekday, start_time=time(9), end_time=time(17)))
        db.commit()
    print("Seeded CareSlot demo data. Local demo accounts use the password documented in README.md.")


if __name__ == "__main__":
    seed()
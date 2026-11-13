from datetime import time

from sqlalchemy import select

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
            ("admin@careslot.test", "CareSlot Administrator", "admin"),
            ("doctor@careslot.test", "Dr. Ayesha Khan", "doctor"),
            ("patient@careslot.test", "Sara Ahmed", "patient"),
        ]
        users: dict[str, User] = {}
        for email, full_name, role in accounts:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(email=email, full_name=full_name, role=role, password_hash=hash_password(DEMO_PASSWORD))
                db.add(user)
                db.flush()
            users[email] = user

        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == users["doctor@careslot.test"].id))
        if doctor is None:
            doctor = DoctorProfile(user_id=users["doctor@careslot.test"].id, specialty_id=specialties["Family Medicine"].id, bio="Patient-focused primary care with a practical, thoughtful approach.", consultation_minutes=30)
            db.add(doctor)
            db.flush()
            for weekday in range(5):
                db.add(WeeklyAvailabilityRule(doctor_id=doctor.id, weekday=weekday, start_time=time(9), end_time=time(17)))
        db.commit()
    print("Seeded CareSlot demo data. All demo accounts use CareSlotDemo!2026")


if __name__ == "__main__":
    seed()
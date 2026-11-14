from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["patient", "doctor", "admin"]
AppointmentStatus = Literal["pending", "confirmed", "completed", "cancelled", "no_show"]


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=10, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RefreshInput(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: Role
    model_config = ConfigDict(from_attributes=True)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class SpecialtyOut(BaseModel):
    id: int
    name: str
    description: str
    model_config = ConfigDict(from_attributes=True)


class SpecialtyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = ""


class AvailabilityRuleInput(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time


class DoctorCreate(UserCreate):
    specialty_id: int
    bio: str = ""
    consultation_minutes: int = Field(default=30, ge=10, le=180)
    availability_rules: list[AvailabilityRuleInput] = Field(min_length=1)


class DoctorOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    specialty_id: int
    specialty_name: str
    bio: str
    consultation_minutes: int


class TimeOffInput(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: str = ""


class TimeOffOut(BaseModel):
    id: int
    starts_at: datetime
    ends_at: datetime
    reason: str
    model_config = ConfigDict(from_attributes=True)


class AppointmentCreate(BaseModel):
    doctor_id: int
    starts_at: datetime
    reason: str = Field(default="", max_length=500)


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentOut(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    reason: str
    doctor_name: str | None = None
    patient_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class SlotOut(BaseModel):
    starts_at: datetime
    ends_at: datetime


class Page(BaseModel):
    items: list[dict[str, object]]
    total: int
    page: int
    page_size: int
export type Role = "patient" | "doctor" | "admin";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
}

export interface Specialty {
  id: number;
  name: string;
  description: string;
}

export interface Doctor {
  id: number;
  user_id: number;
  full_name: string;
  specialty_id: number;
  specialty_name: string;
  bio: string;
  consultation_minutes: number;
}

export interface Slot {
  starts_at: string;
  ends_at: string;
}

export interface Appointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  reason: string;
  doctor_name?: string;
  patient_name?: string;
}

export interface ApiError {
  error?: { code: string; message: string; details?: unknown };
}

export interface TimeOff {
  id: number;
  starts_at: string;
  ends_at: string;
  reason: string;
}
import type { ApiError, Appointment, Doctor, Slot, Specialty, TimeOff, User } from "@/lib/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? "Something went wrong. Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => request<{ user: User }>("/auth/login", json("POST", { email, password })),
  register: (email: string, full_name: string, password: string) => request<{ user: User }>("/auth/register", json("POST", { email, full_name, password })),
  logout: () => request<void>("/auth/logout", json("POST")),
  specialties: () => request<Specialty[]>("/specialties"),
  doctors: (params = "") => request<Doctor[]>(`/doctors${params ? `?${params}` : ""}`),
  doctor: (id: string) => request<Doctor>(`/doctors/${id}`),
  slots: (id: string, day: string) => request<Slot[]>(`/doctors/${id}/slots?day=${day}`),
  appointments: (params = "") => request<Appointment[]>(`/appointments${params ? `?${params}` : ""}`),
  book: (doctor_id: number, starts_at: string, reason: string) => request<Appointment>("/appointments", json("POST", { doctor_id, starts_at, reason })),
  cancel: (id: number) => request<Appointment>(`/appointments/${id}/cancel`, json("POST")),
  reschedule: (id: number, doctor_id: number, starts_at: string, reason: string) => request<Appointment>(`/appointments/${id}/reschedule`, json("POST", { doctor_id, starts_at, reason })),
  updateAppointment: (id: number, status: string) => request<{ status: string }>(`/doctor/appointments/${id}?new_status=${status}`, json("PATCH")),
  updateAdminAppointment: (id: number, status: string) => request<Appointment>(`/appointments/admin/${id}`, json("PATCH", { status })),
  saveAvailability: (rules: { weekday: number; start_time: string; end_time: string }[]) => request<void>("/doctor/availability", json("PUT", rules)),
  availability: () => request<{ weekday: number; start_time: string; end_time: string }[]>("/doctor/availability"),
  addTimeOff: (starts_at: string, ends_at: string, reason: string) => request<{ id: number }>("/doctor/time-off", json("POST", { starts_at, ends_at, reason })),
  timeOff: () => request<TimeOff[]>("/doctor/time-off"),
  deleteTimeOff: (id: number) => request<void>(`/doctor/time-off/${id}`, json("DELETE")),
  createSpecialty: (name: string, description: string) => request<Specialty>("/admin/specialties", json("POST", { name, description })),
  createDoctor: (values: { email: string; full_name: string; password: string; specialty_id: number; bio: string; consultation_minutes: number }) => request<{ id: number; user_id: number }>("/admin/doctors", json("POST", values)),
  deactivateDoctor: (id: number) => request<void>(`/admin/doctors/${id}`, json("DELETE")),
  deleteSpecialty: (id: number) => request<void>(`/admin/specialties/${id}`, json("DELETE")),
  allAppointments: () => request<Appointment[]>("/appointments/admin/all"),
};
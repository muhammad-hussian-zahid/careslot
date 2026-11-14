"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Appointment, Doctor, Specialty } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const appointmentStatuses = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type WeeklyHour = {
  weekday: number;
  enabled: boolean;
  start_time: string;
  end_time: string;
};

const createDefaultHours = (weekdaysEnabled: boolean): WeeklyHour[] => weekdayNames.map((_, weekday) => ({
  weekday,
  enabled: weekdaysEnabled && weekday < 5,
  start_time: "09:00",
  end_time: "17:00",
}));

export default function AdminDashboardPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [newDoctorHours, setNewDoctorHours] = useState(createDefaultHours(true));
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editingHours, setEditingHours] = useState(createDefaultHours(false));
  const [busy, setBusy] = useState(false);

  async function loadDashboard() {
    try {
      const [specialtyData, doctorData, appointmentData] = await Promise.all([
        api.specialties(),
        api.doctors("page=1&page_size=100"),
        api.allAppointments(),
      ]);
      setSpecialties(specialtyData);
      setDoctors(doctorData);
      setAppointments(appointmentData);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to load admin workspace.");
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  async function createDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!specialties.length) {
      toast.error("Create a specialty before adding a doctor.");
      return;
    }
    const availabilityRules = newDoctorHours
      .filter((hours) => hours.enabled)
      .map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }));
    if (!availabilityRules.length) {
      toast.error("Choose at least one working day.");
      return;
    }

    setBusy(true);
    try {
      await api.createDoctor({
        email: String(form.get("email")),
        full_name: String(form.get("name")),
        password: String(form.get("password")),
        specialty_id: Number(form.get("specialty")),
        bio: String(form.get("bio")),
        consultation_minutes: Number(form.get("duration")),
        availability_rules: availabilityRules,
      });
      toast.success("Doctor account and weekly hours created.");
      formElement.reset();
      setNewDoctorHours(createDefaultHours(true));
      await loadDashboard();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to create doctor.");
    } finally {
      setBusy(false);
    }
  }

  async function createSpecialty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api.createSpecialty(String(form.get("specialtyName")), String(form.get("description")));
      toast.success("Specialty added.");
      formElement.reset();
      await loadDashboard();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to add specialty.");
    }
  }

  async function updateAppointmentStatus(id: number, status: string) {
    try {
      await api.updateAdminAppointment(id, status);
      toast.success("Appointment updated.");
      await loadDashboard();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update appointment.");
    }
  }

  async function deactivateDoctor(id: number) {
    try {
      await api.deactivateDoctor(id);
      toast.success("Doctor account deactivated.");
      await loadDashboard();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to deactivate doctor.");
    }
  }

  async function deleteSpecialty(id: number) {
    try {
      await api.deleteSpecialty(id);
      toast.success("Specialty removed.");
      await loadDashboard();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Specialty is still assigned to a doctor.");
    }
  }

  async function openScheduleEditor(doctor: Doctor) {
    setEditingDoctor(doctor);
    setEditingHours(createDefaultHours(false));
    try {
      const savedRules = await api.doctorAvailability(doctor.id);
      setEditingHours(createDefaultHours(false).map((day) => {
        const saved = savedRules.find((rule) => rule.weekday === day.weekday);
        return saved
          ? { ...day, enabled: true, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5) }
          : day;
      }));
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to load clinic hours.");
    }
  }

  async function saveExistingDoctorHours() {
    if (!editingDoctor) return;
    const rules = editingHours
      .filter((hours) => hours.enabled)
      .map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }));
    if (!rules.length) {
      toast.error("Choose at least one working day.");
      return;
    }
    try {
      await api.updateDoctorAvailability(editingDoctor.id, rules);
      toast.success(`Clinic hours saved for ${editingDoctor.full_name}.`);
      setEditingDoctor(null);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to save clinic hours.");
    }
  }

  function updateHours(
    setter: React.Dispatch<React.SetStateAction<WeeklyHour[]>>,
    weekday: number,
    changes: Partial<WeeklyHour>,
  ) {
    setter((current) => current.map((hours) => hours.weekday === weekday ? { ...hours, ...changes } : hours));
  }

  const upcomingAppointments = appointments.filter((appointment) =>
    ["pending", "confirmed"].includes(appointment.status)
    && new Date(appointment.starts_at).getTime() >= Date.now(),
  ).length;

  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 lg:sticky lg:top-24">
        <div className="flex items-center gap-3 px-2 py-3">
          <span className="grid size-10 place-items-center rounded-lg bg-teal-50 text-primary"><Stethoscope size={19} /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Admin workspace</p><p className="text-sm font-bold text-slate-900">CareSlot</p></div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-auto lg:flex-col" aria-label="Admin dashboard">
          <a href="#appointments" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-secondary">Appointments</a>
          <a href="#doctors" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-secondary">Doctors</a>
          <a href="#specialties" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-secondary">Specialties</a>
        </nav>
      </aside>

      <main className="min-w-0 space-y-8">
        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Clinic operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Admin dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Manage appointments, providers, specialties, and clinic hours.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Clinic overview">
          <div className="border-l-4 border-primary bg-white px-4 py-3 shadow-sm"><p className="text-xs font-semibold text-slate-500">Doctors</p><p className="mt-1 text-2xl font-bold text-slate-950">{doctors.length}</p></div>
          <div className="border-l-4 border-emerald-600 bg-white px-4 py-3 shadow-sm"><p className="text-xs font-semibold text-slate-500">Upcoming appointments</p><p className="mt-1 text-2xl font-bold text-slate-950">{upcomingAppointments}</p></div>
          <div className="border-l-4 border-amber-500 bg-white px-4 py-3 shadow-sm"><p className="text-xs font-semibold text-slate-500">Specialties</p><p className="mt-1 text-2xl font-bold text-slate-950">{specialties.length}</p></div>
        </section>

        <section id="appointments">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Schedule activity</p><h2 className="mt-1 text-xl font-bold text-slate-950">All appointments</h2></div><span className="text-xs text-slate-500">{appointments.length} shown · Asia/Karachi</span></div>
          {appointments.length ? (
            <div className="space-y-2">
              {appointments.map((appointment) => (
                <article key={appointment.id} className="flex flex-col justify-between gap-4 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">Appointment #{appointment.id}</h3><StatusBadge status={appointment.status} /></div>
                    <p className="mt-1 text-sm text-slate-600">{appointment.doctor_name ?? `Doctor #${appointment.doctor_id}`} · {appointment.patient_name ?? `Patient #${appointment.patient_id}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(appointment.starts_at))}</p>
                  </div>
                  <label><span className="sr-only">Change appointment status</span><select aria-label={`Appointment ${appointment.id} status`} value={appointment.status} onChange={(event) => void updateAppointmentStatus(appointment.id, event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{appointmentStatuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></label>
                </article>
              ))}
            </div>
          ) : <div className="border-y border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-600">No appointments to display.</div>}
        </section>

        <section id="doctors">
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Care team</p><h2 className="mt-1 text-xl font-bold text-slate-950">Doctors</h2><p className="mt-1 text-sm text-slate-600">Set clinic hours when creating an account, or repair hours for an existing doctor.</p></div>
          <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-bold text-slate-950"><UserRoundPlus size={18} className="text-primary" /> Create doctor account</h3>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createDoctor}>
                <label><span className="mb-1 block text-xs font-semibold text-slate-600">Full name</span><Input required name="name" minLength={2} placeholder="Dr. Ayesha Khan" /></label>
                <label><span className="mb-1 block text-xs font-semibold text-slate-600">Email</span><Input required type="email" name="email" placeholder="doctor@clinic.com" /></label>
                <label><span className="mb-1 block text-xs font-semibold text-slate-600">Temporary password</span><Input required name="password" type="password" minLength={10} placeholder="At least 10 characters" /></label>
                <label><span className="mb-1 block text-xs font-semibold text-slate-600">Specialty</span><select required name="specialty" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Choose specialty</option>{specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label><span className="mb-1 block text-xs font-semibold text-slate-600">Visit length (minutes)</span><Input required type="number" name="duration" min={10} max={180} defaultValue={30} /></label>
                <label><span className="mb-1 block text-xs font-semibold text-slate-600">Short profile bio</span><Input name="bio" placeholder="Area of care and experience" /></label>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-bold text-slate-900">Weekly clinic hours <span className="font-normal text-slate-500">· Asia/Karachi</span></legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {newDoctorHours.map((hours) => (
                      <div key={hours.weekday} className="grid grid-cols-[minmax(105px,1fr)_1fr_1fr] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={hours.enabled} onChange={(event) => updateHours(setNewDoctorHours, hours.weekday, { enabled: event.target.checked })} className="size-4 accent-primary" />{weekdayNames[hours.weekday]}</label>
                        <Input aria-label={`${weekdayNames[hours.weekday]} start`} type="time" value={hours.start_time} disabled={!hours.enabled} onChange={(event) => updateHours(setNewDoctorHours, hours.weekday, { start_time: event.target.value })} className="h-9 px-2 text-xs" />
                        <Input aria-label={`${weekdayNames[hours.weekday]} end`} type="time" value={hours.end_time} disabled={!hours.enabled} onChange={(event) => updateHours(setNewDoctorHours, hours.weekday, { end_time: event.target.value })} className="h-9 px-2 text-xs" />
                      </div>
                    ))}
                  </div>
                </fieldset>
                <div className="sm:col-span-2"><Button disabled={busy}><Plus size={16} /> Create doctor with hours</Button></div>
              </form>
            </Card>

            <Card className="h-fit p-4 sm:p-5">
              <h3 className="font-bold text-slate-950">Provider directory</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div><p className="text-sm font-semibold text-slate-900">{doctor.full_name}</p><p className="text-xs text-slate-600">{doctor.specialty_name} · {doctor.consultation_minutes} min visits</p></div>
                    <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => void openScheduleEditor(doctor)}><CalendarClock size={15} /> Set hours</Button><Button variant="ghost" size="icon" aria-label={`Deactivate ${doctor.full_name}`} title="Deactivate doctor" onClick={() => void deactivateDoctor(doctor.id)}><Trash2 size={16} /></Button></div>
                  </div>
                ))}
                {!doctors.length && <p className="py-4 text-sm text-slate-500">No doctors have been added.</p>}
              </div>
              {editingDoctor && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold text-slate-900">Weekly hours · {editingDoctor.full_name}</h4><p className="mt-1 text-xs text-slate-600">Appointments use these Asia/Karachi times.</p></div><Button variant="ghost" size="sm" onClick={() => setEditingDoctor(null)}>Close</Button></div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {editingHours.map((hours) => (
                      <div key={hours.weekday} className="grid grid-cols-[minmax(105px,1fr)_1fr_1fr] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={hours.enabled} onChange={(event) => updateHours(setEditingHours, hours.weekday, { enabled: event.target.checked })} className="size-4 accent-primary" />{weekdayNames[hours.weekday]}</label>
                        <Input aria-label={`${weekdayNames[hours.weekday]} start`} type="time" value={hours.start_time} disabled={!hours.enabled} onChange={(event) => updateHours(setEditingHours, hours.weekday, { start_time: event.target.value })} className="h-9 px-2 text-xs" />
                        <Input aria-label={`${weekdayNames[hours.weekday]} end`} type="time" value={hours.end_time} disabled={!hours.enabled} onChange={(event) => updateHours(setEditingHours, hours.weekday, { end_time: event.target.value })} className="h-9 px-2 text-xs" />
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="mt-3" onClick={() => void saveExistingDoctorHours()}><Save size={15} /> Save hours</Button>
                </div>
              )}
            </Card>
          </div>
        </section>

        <section id="specialties">
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Directory setup</p><h2 className="mt-1 text-xl font-bold text-slate-950">Specialties</h2><p className="mt-1 text-sm text-slate-600">Keep the public care directory useful and easy to browse.</p></div>
          <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]">
            <Card className="p-4 sm:p-5"><h3 className="font-bold">Add specialty</h3><form onSubmit={createSpecialty} className="mt-4 space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Name</span><Input required name="specialtyName" minLength={2} maxLength={100} placeholder="Cardiology" /></label><label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Description</span><Input name="description" placeholder="Heart and cardiovascular care" /></label><Button variant="outline"><Plus size={16} /> Add specialty</Button></form></Card>
            <Card className="p-4 sm:p-5"><h3 className="font-bold">Directory specialties</h3><div className="mt-3 divide-y divide-slate-100">{specialties.map((specialty) => <div key={specialty.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-900">{specialty.name}</p><p className="text-xs text-slate-600">{specialty.description}</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${specialty.name}`} title="Delete specialty" onClick={() => void deleteSpecialty(specialty.id)}><Trash2 size={16} /></Button></div>)}</div></Card>
          </div>
        </section>
      </main>
    </div>
  );
}
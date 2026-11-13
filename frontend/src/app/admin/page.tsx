"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Stethoscope, Trash2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Appointment, Doctor, Specialty } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

export default function AdminDashboardPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [specialtyData, doctorData, appointmentData] = await Promise.all([api.specialties(), api.doctors("page=1&page_size=100"), api.allAppointments()]);
      setSpecialties(specialtyData); setDoctors(doctorData); setAppointments(appointmentData);
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to load admin workspace."); }
  }
  useEffect(() => { void load(); }, []);

  async function createDoctor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!specialties.length) { toast.error("Create a specialty before adding a doctor."); return; }
    setBusy(true);
    try {
      await api.createDoctor({ email: String(form.get("email")), full_name: String(form.get("name")), password: String(form.get("password")), specialty_id: Number(form.get("specialty")), bio: String(form.get("bio")), consultation_minutes: Number(form.get("duration")) });
      toast.success("Doctor account created."); formElement.reset(); await load();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to create doctor."); }
    finally { setBusy(false); }
  }

  async function createSpecialty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try { await api.createSpecialty(String(form.get("specialtyName")), String(form.get("description"))); toast.success("Specialty added."); formElement.reset(); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to add specialty."); }
  }

  async function updateStatus(id: number, status: string) {
    try { await api.updateAdminAppointment(id, status); toast.success("Appointment updated."); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to update appointment."); }
  }

  async function deactivateDoctor(id: number) {
    try { await api.deactivateDoctor(id); toast.success("Doctor account deactivated."); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to deactivate doctor."); }
  }

  async function deleteSpecialty(id: number) {
    try { await api.deleteSpecialty(id); toast.success("Specialty removed."); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Specialty is still assigned to a doctor."); }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
      <aside className="h-fit rounded-xl border bg-white p-3 lg:sticky lg:top-24"><div className="flex items-center gap-3 px-2 py-3"><span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary"><Stethoscope size={19} /></span><div><p className="text-xs font-semibold text-slate-500">ADMIN WORKSPACE</p><p className="text-sm font-bold text-slate-900">CareSlot</p></div></div><nav className="mt-3 flex gap-2 overflow-auto lg:flex-col" aria-label="Admin dashboard"><a href="#appointments" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">Appointments</a><a href="#doctors" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">Doctors</a><a href="#specialties" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary">Specialties</a></nav></aside>
      <div className="min-w-0 space-y-8">
        <div><p className="text-sm font-bold text-primary">Clinic operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Admin dashboard</h1><p className="mt-2 text-sm text-slate-600">Manage the provider directory and appointment activity.</p></div>
        <section id="appointments"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">All appointments</h2><p className="text-sm text-slate-600">{appointments.length} appointments shown</p></div><CalendarDays className="text-primary" size={20} /></div>
          {appointments.length ? <div className="space-y-3">{appointments.map((appointment) => <Card key={appointment.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">Appointment #{appointment.id}</h3><StatusBadge status={appointment.status} /></div><p className="mt-1 text-sm text-slate-600">{appointment.doctor_name ?? `Doctor #${appointment.doctor_id}`} · {appointment.patient_name ?? `Patient #${appointment.patient_id}`}</p><p className="mt-1 text-sm text-slate-600">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(appointment.starts_at))}</p></div><label className="flex items-center gap-2"><span className="sr-only">Change appointment status</span><select aria-label={`Appointment ${appointment.id} status`} value={appointment.status} onChange={(event) => void updateStatus(appointment.id, event.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></label></Card>)}</div> : <Card className="p-8 text-center text-sm text-slate-600">No appointments to display.</Card>}
        </section>
        <section id="doctors"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Doctors</h2><p className="text-sm text-slate-600">Create clinician accounts and add them to the directory.</p></div>
          <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
            <Card className="p-4 sm:p-5"><h3 className="flex items-center gap-2 font-bold"><UserRoundPlus size={18} className="text-primary" /> Create doctor account</h3><form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={createDoctor}><label><span className="mb-1 block text-xs font-semibold text-slate-600">Full name</span><Input required name="name" minLength={2} placeholder="Dr. Ayesha Khan" /></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Email</span><Input required type="email" name="email" placeholder="doctor@clinic.com" /></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Temporary password</span><Input required name="password" type="password" minLength={10} placeholder="At least 10 characters" /></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Specialty</span><select required name="specialty" className="h-11 w-full rounded-lg border bg-white px-3 text-sm"><option value="">Choose specialty</option>{specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Visit length (minutes)</span><Input required type="number" name="duration" min={10} max={180} defaultValue={30} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Short profile bio</span><Input name="bio" placeholder="Area of care and experience" /></label><div className="sm:col-span-2"><Button disabled={busy}><Plus size={16} /> Create doctor</Button></div></form></Card>
            <Card className="p-4 sm:p-5"><h3 className="font-bold">Provider directory</h3><div className="mt-3 divide-y">{doctors.map((doctor) => <div key={doctor.id} className="flex items-start justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-900">{doctor.full_name}</p><p className="text-xs text-slate-600">{doctor.specialty_name}</p></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">{doctor.consultation_minutes} min</span><Button variant="ghost" size="icon" aria-label={`Deactivate ${doctor.full_name}`} title="Deactivate doctor" onClick={() => void deactivateDoctor(doctor.id)}><Trash2 size={16} /></Button></div></div>)}{!doctors.length && <p className="py-4 text-sm text-slate-500">No doctors have been added.</p>}</div></Card>
          </div>
        </section>
        <section id="specialties"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Specialties</h2><p className="text-sm text-slate-600">Keep the public directory organized.</p></div>
          <div className="grid gap-4 md:grid-cols-[.8fr_1.2fr]"><Card className="p-4 sm:p-5"><h3 className="font-bold">Add specialty</h3><form onSubmit={createSpecialty} className="mt-4 space-y-3"><label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Name</span><Input required name="specialtyName" minLength={2} maxLength={100} placeholder="Cardiology" /></label><label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Description</span><Input name="description" placeholder="Heart and cardiovascular care" /></label><Button variant="outline"><Plus size={16} /> Add specialty</Button></form></Card><Card className="p-4 sm:p-5"><h3 className="font-bold">Directory specialties</h3><div className="mt-3 divide-y">{specialties.map((specialty) => <div key={specialty.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-900">{specialty.name}</p><p className="text-xs text-slate-600">{specialty.description}</p></div><Button variant="ghost" size="icon" aria-label={`Delete ${specialty.name}`} title="Delete specialty" onClick={() => void deleteSpecialty(specialty.id)}><Trash2 size={16} /></Button></div>)}</div></Card></div>
        </section>
      </div>
    </div>
  );
}
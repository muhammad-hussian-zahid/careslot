"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Appointment, Slot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function formatAppointment(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "Asia/Karachi" }).format(date),
    time: new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" }).format(date),
  };
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<Record<number, Slot[]>>({});
  const [dates, setDates] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try { setAppointments(await api.appointments("page=1&page_size=100")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load appointments."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function cancel(id: number) {
    try { await api.cancel(id); toast.success("Appointment cancelled."); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to cancel appointment."); }
  }

  async function showReschedule(appointment: Appointment) {
    const opening = open === appointment.id ? null : appointment.id;
    setOpen(opening);
    if (!opening) return;
    const day = dates[appointment.id] ?? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setDates((current) => ({ ...current, [appointment.id]: day }));
    try { const available = await api.slots(String(appointment.doctor_id), day); setSlots((current) => ({ ...current, [appointment.id]: available })); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to load times."); }
  }

  async function changeDate(appointment: Appointment, day: string) {
    setDates((current) => ({ ...current, [appointment.id]: day }));
    try { const available = await api.slots(String(appointment.doctor_id), day); setSlots((current) => ({ ...current, [appointment.id]: available })); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to load times."); }
  }

  async function reschedule(appointment: Appointment, startsAt: string) {
    try { await api.reschedule(appointment.id, appointment.doctor_id, startsAt, appointment.reason); toast.success("Appointment rescheduled."); setOpen(null); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to reschedule."); }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-primary">Your care, organized</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">My appointments</h1><p className="mt-2 text-sm text-slate-600">Review upcoming visits and manage changes in one place.</p></div><Button asChild><Link href="/doctors"><Plus size={17} /> Book a visit</Link></Button></div>
      {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="mt-7 space-y-3">
        {loading ? <><div className="h-36 animate-pulse rounded-xl bg-slate-200" /><div className="h-36 animate-pulse rounded-xl bg-slate-200" /></> : appointments.length ? appointments.map((appointment) => {
          const dateTime = formatAppointment(appointment.starts_at);
          const active = appointment.status === "pending" || appointment.status === "confirmed";
          return <Card key={appointment.id} className="p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div className="flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><CalendarDays size={21} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{appointment.doctor_name ?? "Clinic appointment"}</h2><StatusBadge status={appointment.status} /></div><p className="mt-1 text-sm font-medium text-slate-700">Doctor · {dateTime.time}</p><p className="mt-1 text-sm text-slate-600">{dateTime.date}</p>{appointment.reason && <p className="mt-1 max-w-2xl text-sm text-slate-500">{appointment.reason}</p>}</div></div>{active && <div className="flex flex-wrap gap-2 md:justify-end"><Button variant="outline" size="sm" onClick={() => void showReschedule(appointment)}><RefreshCw size={15} /> Reschedule</Button><Button variant="ghost" size="sm" onClick={() => void cancel(appointment.id)}><X size={15} /> Cancel</Button></div>}</div>
            {open === appointment.id && <div className="mt-5 border-t pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="w-full sm:max-w-[220px]"><span className="mb-1 block text-xs font-semibold text-slate-600">New date</span><Input type="date" min={new Date().toISOString().slice(0, 10)} value={dates[appointment.id] ?? ""} onChange={(event) => void changeDate(appointment, event.target.value)} /></label><div><p className="mb-1 text-xs font-semibold text-slate-600">Available times</p><div className="flex flex-wrap gap-2">{(slots[appointment.id] ?? []).length ? slots[appointment.id].map((slot) => <Button key={slot.starts_at} size="sm" variant="outline" onClick={() => void reschedule(appointment, slot.starts_at)}><Clock3 size={14} />{new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" }).format(new Date(slot.starts_at))}</Button>) : <span className="py-2 text-sm text-slate-500">No times available for this date.</span>}</div></div></div></div>}
          </Card>;
        }) : !error && <Card className="py-16 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary"><CalendarDays /></div><h2 className="mt-4 font-bold text-slate-900">No appointments yet</h2><p className="mt-1 text-sm text-slate-600">Find a doctor to book your first visit.</p><Button asChild className="mt-5"><Link href="/doctors">Browse doctors</Link></Button></Card>}
      </div>
    </div>
  );
}
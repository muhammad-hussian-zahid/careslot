"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Save, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Appointment, TimeOff } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Rule = { weekday: number; enabled: boolean; start_time: string; end_time: string };
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const initialRules = weekDays.map((_, weekday) => ({ weekday, enabled: weekday < 5, start_time: "09:00", end_time: "17:00" }));

export default function DoctorDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [timeOffStart, setTimeOffStart] = useState("");
  const [timeOffEnd, setTimeOffEnd] = useState("");
  const [timeOffReason, setTimeOffReason] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [appointmentData, scheduleData, timeOffData] = await Promise.all([api.appointments("page=1&page_size=100"), api.availability(), api.timeOff()]);
      setAppointments(appointmentData);
      setTimeOff(timeOffData);
      setRules(initialRules.map((item) => {
        const saved = scheduleData.find((rule) => rule.weekday === item.weekday);
        return saved ? { ...item, enabled: true, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5) } : { ...item, enabled: false };
      }));
    }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to load dashboard."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveRules() {
    try { await api.saveAvailability(rules.filter((rule) => rule.enabled).map(({ weekday, start_time, end_time }) => ({ weekday, start_time, end_time }))); toast.success("Weekly schedule saved."); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to save schedule."); }
  }

  async function addTimeOff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api.addTimeOff(`${timeOffStart}:00+05:00`, `${timeOffEnd}:00+05:00`, timeOffReason);
      toast.success("Time off added."); setTimeOffStart(""); setTimeOffEnd(""); setTimeOffReason("");
      setTimeOff(await api.timeOff());
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to add time off."); }
  }

  async function removeTimeOff(id: number) {
    try { await api.deleteTimeOff(id); setTimeOff(await api.timeOff()); toast.success("Time off removed."); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to remove time off."); }
  }

  async function updateStatus(appointmentId: number, status: string) {
    try { await api.updateAppointment(appointmentId, status); toast.success(`Appointment ${status.replace("_", " ")}.`); await load(); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Unable to update appointment."); }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
      <aside className="h-fit rounded-xl border bg-white p-3 lg:sticky lg:top-24"><div className="flex items-center gap-3 px-2 py-3"><span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary"><Stethoscope size={19} /></span><div><p className="text-xs font-semibold text-slate-500">DOCTOR WORKSPACE</p><p className="text-sm font-bold text-slate-900">Practice</p></div></div><nav className="mt-3 flex gap-2 overflow-auto lg:flex-col" aria-label="Doctor dashboard"><a href="#appointments" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-secondary">Appointments</a><a href="#schedule" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-secondary">Weekly schedule</a><a href="#time-off" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-secondary">Time off</a></nav></aside>
      <div className="min-w-0 space-y-7">
        <div><p className="text-sm font-bold text-primary">Practice overview</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Doctor dashboard</h1><p className="mt-2 text-sm text-slate-600">Keep your availability up to date and manage today’s care.</p></div>
        <section id="appointments"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Appointments</h2><span className="text-xs text-slate-500">Times in Asia/Karachi</span></div>
          {loading ? <Card className="h-28 animate-pulse bg-slate-100" /> : appointments.length ? <div className="space-y-3">{appointments.map((appointment) => <Card key={appointment.id} className="p-4 sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{appointment.patient_name ?? "Patient"}</h3><StatusBadge status={appointment.status} /></div><p className="mt-1 text-sm text-slate-600">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(appointment.starts_at))}</p>{appointment.reason && <p className="mt-1 text-sm text-slate-500">{appointment.reason}</p>}</div><div className="flex flex-wrap gap-2">{appointment.status === "pending" && <Button size="sm" onClick={() => void updateStatus(appointment.id, "confirmed")}><Check size={15} /> Confirm</Button>}{appointment.status === "confirmed" && <><Button size="sm" variant="outline" onClick={() => void updateStatus(appointment.id, "completed")}>Complete</Button><Button size="sm" variant="outline" onClick={() => void updateStatus(appointment.id, "no_show")}>No-show</Button></>}{["pending", "confirmed"].includes(appointment.status) && <Button size="sm" variant="ghost" onClick={() => void updateStatus(appointment.id, "cancelled")}>Cancel</Button>}</div></div></Card>)}</div> : <Card className="p-8 text-center text-sm text-slate-600">No appointments scheduled.</Card>}
        </section>
        <section id="schedule"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Weekly schedule</h2><p className="text-sm text-slate-600">Set your recurring clinic hours.</p></div><Button onClick={() => void saveRules()}><Save size={16} /> Save hours</Button></div>
          <Card className="divide-y px-4">{rules.map((rule) => <div key={rule.weekday} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 sm:grid-cols-[130px_1fr_150px_150px] sm:gap-4"><label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" checked={rule.enabled} onChange={(event) => setRules((current) => current.map((item) => item.weekday === rule.weekday ? { ...item, enabled: event.target.checked } : item))} className="size-4 accent-primary" />{weekDays[rule.weekday]}</label><span className="hidden text-xs text-slate-500 sm:block">{rule.enabled ? "Available" : "Unavailable"}</span><Input aria-label={`${weekDays[rule.weekday]} start time`} type="time" value={rule.start_time} disabled={!rule.enabled} onChange={(event) => setRules((current) => current.map((item) => item.weekday === rule.weekday ? { ...item, start_time: event.target.value } : item))} className="h-10" /><Input aria-label={`${weekDays[rule.weekday]} end time`} type="time" value={rule.end_time} disabled={!rule.enabled} onChange={(event) => setRules((current) => current.map((item) => item.weekday === rule.weekday ? { ...item, end_time: event.target.value } : item))} className="h-10" /></div>)}</Card>
        </section>
        <section id="time-off"><div className="mb-3"><h2 className="text-lg font-bold text-slate-900">Time off</h2><p className="text-sm text-slate-600">Block a date range from appointment bookings.</p></div>
          <Card className="p-4 sm:p-5"><form className="grid gap-3 sm:grid-cols-2" onSubmit={addTimeOff}><label><span className="mb-1 block text-xs font-semibold text-slate-600">Starts</span><Input required type="datetime-local" value={timeOffStart} onChange={(event) => setTimeOffStart(event.target.value)} /></label><label><span className="mb-1 block text-xs font-semibold text-slate-600">Ends</span><Input required type="datetime-local" value={timeOffEnd} onChange={(event) => setTimeOffEnd(event.target.value)} /></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Note (optional)</span><Input value={timeOffReason} onChange={(event) => setTimeOffReason(event.target.value)} maxLength={250} placeholder="e.g. Annual leave" /></label><div className="sm:col-span-2"><Button type="submit" variant="outline"><Plus size={16} /> Add time off</Button><p className="mt-2 text-xs text-slate-500">Entered times are interpreted in Asia/Karachi.</p></div></form>{timeOff.length > 0 && <div className="mt-5 divide-y border-t">{timeOff.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-slate-800">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(item.starts_at))} to {new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(item.ends_at))}</p>{item.reason && <p className="text-xs text-slate-500">{item.reason}</p>}</div><Button variant="ghost" size="icon" aria-label="Remove time off" title="Remove time off" onClick={() => void removeTimeOff(item.id)}><Trash2 size={16} /></Button></div>)}</div>}</Card>
        </section>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Doctor, Slot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const dateToday = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function DoctorBooking({ id }: { id: string }) {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [day, setDay] = useState(dateToday());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const prettyDate = useMemo(() => new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "Asia/Karachi" }).format(new Date(`${day}T12:00:00+05:00`)), [day]);

  useEffect(() => { api.doctor(id).then(setDoctor).catch((reason) => setError(reason instanceof Error ? reason.message : "Doctor not found.")); }, [id]);
  useEffect(() => {
    setSelected("");
    setLoadingSlots(true);
    api.slots(id, day).then(setSlots).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load available times.")).finally(() => setLoadingSlots(false));
  }, [day, id]);

  async function book() {
    if (!doctor || !selected) return;
    setBusy(true);
    try {
      await api.book(doctor.id, selected, reason);
      toast.success("Appointment requested.");
      router.push("/appointments");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to book this time.";
      setError(message);
      if (message.toLowerCase().includes("authentication")) router.push("/login");
    } finally { setBusy(false); }
  }

  if (!doctor) return <div className="mx-auto max-w-4xl px-4 py-12"><Card className="h-48 animate-pulse bg-slate-100" /></div>;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/doctors" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"><ArrowLeft size={16} /> All doctors</Link>
      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="h-fit p-6"><div className="grid size-14 place-items-center rounded-xl bg-secondary text-primary"><Stethoscope size={26} /></div><p className="mt-5 text-sm font-semibold text-primary">{doctor.specialty_name}</p><h1 className="mt-1 text-2xl font-bold text-slate-950">{doctor.full_name}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{doctor.bio || "Experienced clinician focused on thoughtful, patient-centered care."}</p><div className="mt-5 flex items-center gap-2 border-t pt-4 text-sm text-slate-600"><Clock3 size={16} className="text-primary" /> {doctor.consultation_minutes} minute appointment</div><div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={16} className="text-primary" /> Clinic time: Asia/Karachi</div></Card>
        <Card className="p-5 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-primary">Book an appointment</p><h2 className="mt-1 text-xl font-bold text-slate-950">Choose a date and time</h2></div><label className="block w-full sm:max-w-[210px]"><span className="mb-1 block text-xs font-semibold text-slate-600">Appointment date</span><Input type="date" min={dateToday()} value={day} onChange={(event) => setDay(event.target.value)} /></label></div>
          <p className="mt-5 text-sm font-semibold text-slate-700">{prettyDate}</p>
          {loadingSlots ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"><span className="h-10 animate-pulse rounded-lg bg-slate-100" /><span className="h-10 animate-pulse rounded-lg bg-slate-100" /><span className="h-10 animate-pulse rounded-lg bg-slate-100" /></div> : slots.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Available appointment times">{slots.map((slot) => { const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" }).format(new Date(slot.starts_at)); return <button key={slot.starts_at} type="button" aria-pressed={selected === slot.starts_at} onClick={() => setSelected(slot.starts_at)} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === slot.starts_at ? "border-primary bg-primary text-white" : "bg-white text-slate-700 hover:border-primary hover:text-primary"}`}>{time}</button>; })}</div> : <div className="mt-3 rounded-lg bg-secondary/60 px-4 py-7 text-center"><p className="text-sm font-semibold text-slate-700">No times available for this date.</p><p className="mt-1 text-xs text-slate-500">Try another day to see more openings.</p></div>}
          <label className="mt-5 block"><span className="mb-1.5 block text-sm font-semibold">What would you like help with? <span className="font-normal text-slate-500">(optional)</span></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} className="w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" placeholder="Brief note for the clinic" /></label>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center"><p className="text-xs text-slate-500">Your appointment will be requested for confirmation.</p><Button disabled={!selected || busy} onClick={book}>{busy ? "Booking…" : "Request appointment"}</Button></div>
        </Card>
      </div>
    </div>
  );
}
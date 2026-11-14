"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, CalendarClock, Search, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import type { Doctor, Specialty } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDoctors(searchValue = search, specialtyValue = specialtyId) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("search", searchValue.trim());
    if (specialtyValue) params.set("specialty_id", specialtyValue);
    try { setDoctors(await api.doctors(params.toString())); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load doctors."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    api.specialties().then(setSpecialties).catch(() => setSpecialties([]));
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search") ?? "";
    const initialSpecialty = params.get("specialty") ?? "";
    setSearch(initialSearch);
    setSpecialtyId(initialSpecialty);
    const query = new URLSearchParams();
    if (initialSearch) query.set("search", initialSearch);
    if (initialSpecialty) query.set("specialty_id", initialSpecialty);
    api.doctors(query.toString()).then(setDoctors).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load doctors.")).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[70vh]">
      <section className="border-b border-slate-200 bg-[#f0f7f6]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">CareSlot directory</p>
          <div className="mt-2 grid gap-5 md:grid-cols-[1fr_auto] md:items-end"><div><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Find the right doctor.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Search by clinician or specialty, then choose from their actual clinic hours.</p></div><p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><CalendarClock size={16} className="text-primary" /> Clinic time · Asia/Karachi</p></div>
          <form onSubmit={(event) => { event.preventDefault(); void loadDoctors(); }} className="mt-7 grid gap-3 border border-slate-200 bg-white p-3 shadow-soft sm:grid-cols-[1fr_260px_auto] sm:p-4">
            <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Doctor or specialty</span><span className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try a name or ‘family medicine’" className="pl-9" /></span></label>
            <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Filter specialty</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">Every specialty</option>{specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <Button type="submit" className="self-end"><Search size={16} /> Search doctors</Button>
          </form>
          {specialties.length > 0 && <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular specialties">{specialties.slice(0, 5).map((item) => <button key={item.id} type="button" onClick={() => { setSpecialtyId(String(item.id)); void loadDoctors(search, String(item.id)); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${specialtyId === String(item.id) ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700 hover:border-primary hover:text-primary"}`}>{item.name}</button>)}</div>}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Your matches</p><h2 className="mt-1 text-xl font-bold text-slate-950">{loading ? "Finding clinicians…" : `${doctors.length} ${doctors.length === 1 ? "doctor" : "doctors"}`}</h2></div><span className="hidden text-xs text-slate-500 sm:block">Select a profile to see dates and times</span></div>
        {error && <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {loading ? <div className="space-y-3" aria-label="Loading doctors"><div className="h-40 animate-pulse bg-slate-200" /><div className="h-40 animate-pulse bg-slate-200" /></div> : doctors.length ? <div className="space-y-3">{doctors.map((doctor) => <article key={doctor.id} className="grid gap-5 border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-soft md:grid-cols-[auto_1fr_auto] md:items-center md:p-6"><span className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-primary"><Stethoscope size={25} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-slate-950">{doctor.full_name}</h3><BadgeCheck size={16} className="text-emerald-700" aria-label="Listed clinician" /></div><p className="mt-0.5 text-sm font-bold text-primary">{doctor.specialty_name}</p><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{doctor.bio || "Patient-centered care with time for a thoughtful conversation."}</p><p className="mt-2 text-xs font-medium text-slate-500">{doctor.consultation_minutes} minute visit · Clinic time Asia/Karachi</p></div><Button asChild><Link href={`/doctors/${doctor.id}`}>Choose a time <ArrowRight size={16} /></Link></Button></article>)}</div> : !error && <div className="border-y border-slate-200 bg-white px-5 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-teal-50 text-primary"><Stethoscope size={22} /></span><h3 className="mt-4 text-lg font-bold text-slate-950">No clinicians match yet</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">Try a different name or clear the specialty filter to see the full directory.</p><Button variant="outline" className="mt-5" onClick={() => { setSearch(""); setSpecialtyId(""); void loadDoctors("", ""); }}>Clear filters</Button></div>}
      </section>
    </div>
  );
}
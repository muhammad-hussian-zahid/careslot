"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Search, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import type { Doctor, Specialty } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
      <div className="animate-rise-in">
        <p className="text-sm font-bold text-primary">Find the care you need</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Doctors and specialists</h1>
        <p className="mt-2 text-sm text-slate-600">Browse clinicians and see their available appointment times.</p>
      </div>
      <Card className="mt-6 p-4">
        <form onSubmit={(event) => { event.preventDefault(); void loadDoctors(); }} className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Search by name</span><span className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Ayesha Khan" className="pl-9" /></span></label>
          <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Specialty</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">All specialties</option>{specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <Button type="submit" className="self-end"><Search size={16} /> Search</Button>
        </form>
      </Card>
      <div className="mb-4 mt-8 flex items-center justify-between"><h2 className="font-bold text-slate-900">{loading ? "Finding doctors…" : `${doctors.length} ${doctors.length === 1 ? "doctor" : "doctors"}`}</h2><span className="text-xs text-slate-500">Appointments shown in Asia/Karachi time</span></div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-xl bg-slate-200" /><div className="h-48 animate-pulse rounded-xl bg-slate-200" /></div> : doctors.length ? <div className="grid gap-4 md:grid-cols-2">{doctors.map((doctor) => <Card key={doctor.id} className="flex flex-col p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5"><div className="flex gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Stethoscope size={24} /></div><div><h3 className="font-bold text-slate-900">{doctor.full_name}</h3><p className="text-sm font-medium text-primary">{doctor.specialty_name}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{doctor.bio || "Experienced clinician focused on thoughtful, patient-centered care."}</p><p className="mt-2 text-xs text-slate-500">{doctor.consultation_minutes} minute consultation</p></div></div><Button asChild variant="outline" className="mt-4 shrink-0 sm:mt-0"><Link href={`/doctors/${doctor.id}`}><CalendarDays size={16} /> View times</Link></Button></Card>)}</div> : !error && <Card className="py-16 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary"><Stethoscope /></div><h3 className="mt-4 font-bold text-slate-900">No doctors found</h3><p className="mt-1 text-sm text-slate-600">Try changing your search or specialty.</p></Card>}
    </div>
  );
}
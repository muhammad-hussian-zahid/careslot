"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowRight, CalendarCheck2, Clock3, HeartPulse, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import type { Doctor, Specialty } from "@/lib/types";
import { Button } from "@/components/ui/button";

const steps = [
  { number: "01", title: "Find your specialist", copy: "Search by clinician or choose the kind of care you need." },
  { number: "02", title: "Pick your time", copy: "Choose from the doctor’s current clinic availability." },
  { number: "03", title: "You’re on the calendar", copy: "Review and manage your visit from your account." },
];

export function HomeExperience() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.specialties(), api.doctors("page=1&page_size=3")])
      .then(([specialtyData, doctorData]) => {
        if (active) { setSpecialties(specialtyData); setDoctors(doctorData); }
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  function directoryUrl(nextSpecialtyId = specialtyId) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (nextSpecialtyId) params.set("specialty", nextSpecialtyId);
    return `/doctors${params.size ? `?${params}` : ""}`;
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#073b45] text-white">
        <div className="absolute inset-y-0 right-0 hidden w-[48%] bg-cover bg-center lg:block" role="img" aria-label="Doctor ready to welcome a patient" style={{ backgroundImage: "linear-gradient(90deg, #073b45 0%, rgba(7,59,69,.15) 48%, rgba(7,59,69,.02) 100%), url('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1400&q=88')" }} />
        <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
          <div className="animate-rise-in max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-teal-50"><CalendarCheck2 size={15} /> HEALTHCARE, ON YOUR CALENDAR</p>
            <h1 className="mt-6 max-w-xl text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl">Care that fits your time.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-teal-50/85 sm:text-lg">Find a trusted doctor, see real clinic openings, and book the visit that works for you.</p>
            <form onSubmit={(event) => { event.preventDefault(); window.location.assign(directoryUrl()); }} className="mt-8 grid gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-2xl shadow-black/20 sm:grid-cols-[1fr_.8fr_auto] sm:p-4">
              <label className="min-w-0"><span className="mb-1.5 block text-xs font-bold text-slate-600">Doctor or specialty</span><span className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, cardiology…" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></span></label>
              <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Specialty</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">All specialties</option>{specialties.map((specialty) => <option value={specialty.id} key={specialty.id}>{specialty.name}</option>)}</select></label>
              <Button type="submit" className="self-end"><Search size={16} /> Find care</Button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-teal-50/85"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> Times shown in Asia/Karachi</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Your appointment, clearly organized</span></div>
          </div>
          <div className="relative hidden min-h-[480px] lg:block" aria-hidden="true">
            <div className="absolute bottom-8 left-4 w-[310px] rounded-2xl border border-white/70 bg-white p-5 text-slate-900 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-primary">A better kind of booking</span><span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-primary"><HeartPulse size={18} /></span></div>
              <p className="mt-3 text-xl font-bold leading-tight">Less back-and-forth. More time for care.</p>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600"><span className="size-2 rounded-full bg-emerald-500" />Availability stays connected to the doctor’s schedule</div>
            </div>
            <div className="absolute right-2 top-10 flex size-28 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 text-center backdrop-blur"><span className="text-3xl font-bold">01</span><span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-teal-50">good next step</span></div>
          </div>
          <div className="min-h-[250px] overflow-hidden rounded-2xl border border-white/20 bg-cover bg-center lg:hidden" role="img" aria-label="Doctor ready to welcome a patient" style={{ backgroundImage: "linear-gradient(0deg, rgba(7,59,69,.15), rgba(7,59,69,.02)), url('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=85')" }} />
          <a href="#specialties" className="absolute bottom-5 left-6 hidden items-center gap-2 text-xs font-semibold text-teal-50/80 hover:text-white lg:flex"><ArrowDownRight size={15} /> Explore care</a>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Start with what you need</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Care for every kind of day.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Choose a specialty to see the clinicians and appointment times available.</p></div><Link href="/doctors" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">Explore all care <ArrowRight size={16} /></Link></div>
        {specialties.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{specialties.map((specialty, index) => <Link key={specialty.id} href={`/doctors?specialty=${specialty.id}`} className="group flex min-h-36 flex-col justify-between border-t-2 border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-primary hover:shadow-soft"><span className={`grid size-10 place-items-center rounded-xl ${index % 2 ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-primary"}`}><Stethoscope size={19} /></span><span><span className="block font-bold text-slate-900 group-hover:text-primary">{specialty.name}</span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600">{specialty.description || "Find a clinician and choose a time."}</span></span></Link>)}</div> : <div className="mt-8 border-t border-slate-200 py-8 text-sm text-slate-600">{loadError ? "Specialties are temporarily unavailable." : "Loading specialties…"}</div>}
      </section>

      <section className="border-y border-slate-200 bg-[#f0f7f6]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[.65fr_1.35fr] lg:gap-16"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">The CareSlot rhythm</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Three clear steps to your visit.</h2><p className="mt-3 text-sm leading-6 text-slate-600">From choosing a specialist to managing your appointment, everything stays in one place.</p></div><div className="grid gap-0 sm:grid-cols-3">{steps.map((step) => <article key={step.number} className="border-t border-slate-300 py-5 sm:mr-5"><span className="font-mono text-sm font-bold text-primary">{step.number}</span><h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.copy}</p></article>)}</div></div></div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Meet your care team</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Doctors, with time for you.</h2><p className="mt-2 text-sm text-slate-600">Explore a few of the clinicians in the CareSlot directory.</p></div><Button variant="outline" asChild><Link href="/doctors">View the doctor directory <ArrowRight size={16} /></Link></Button></div>
        {doctors.length ? <div className="mt-8 grid gap-4 md:grid-cols-3">{doctors.map((doctor) => <article key={doctor.id} className="flex min-h-[245px] flex-col border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-primary"><Stethoscope size={22} /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{doctor.consultation_minutes} min visit</span></div><div className="mt-6"><p className="text-xs font-bold uppercase tracking-wide text-primary">{doctor.specialty_name}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{doctor.full_name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{doctor.bio || "Patient-centered care, built around a thoughtful conversation."}</p></div><Link href={`/doctors/${doctor.id}`} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-primary hover:underline">View profile and times <ArrowRight size={15} /></Link></article>)}</div> : <div className="mt-8 border-y border-slate-200 py-8 text-sm text-slate-600">{loadError ? "The doctor directory is temporarily unavailable." : "Loading clinicians…"}</div>}
      </section>

      <section className="bg-[#073b45] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-teal-100">Your next step</p><h2 className="mt-2 text-2xl font-bold">Find the care that fits your calendar.</h2></div><Button variant="secondary" asChild><Link href="/doctors">Find a doctor <ArrowRight size={16} /></Link></Button></div></section>
    </>
  );
}
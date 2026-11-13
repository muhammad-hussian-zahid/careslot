"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck2, Clock3, HeartPulse, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import type { Specialty } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const assurances = [
  { icon: ShieldCheck, title: "Trusted clinicians", copy: "Browse verified doctors by specialty." },
  { icon: Clock3, title: "Times that work", copy: "See real availability before you book." },
  { icon: CalendarCheck2, title: "Easy to manage", copy: "Keep every appointment in one place." },
];

export default function HomePage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyId, setSpecialtyId] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { api.specialties().then(setSpecialties).catch(() => setSpecialties([])); }, []);

  function searchHref() {
    const params = new URLSearchParams();
    if (specialtyId) params.set("specialty", specialtyId);
    if (query.trim()) params.set("search", query.trim());
    return `/doctors${params.size ? `?${params}` : ""}`;
  }

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-[1.02fr_.98fr] md:gap-12 md:pb-20 md:pt-16 lg:px-8">
        <div className="animate-rise-in py-2">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-sm"><HeartPulse size={15} /> Care that fits your day</div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl">Your next good health decision starts here.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">Find the right doctor, choose a time that works, and book your clinic visit with confidence.</p>
          <Card className="mt-8 p-3 sm:p-4">
            <form action="/doctors" onSubmit={(event) => { event.preventDefault(); window.location.assign(searchHref()); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="min-w-0"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Doctor or specialty</span><span className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or specialty" className="h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /></span></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Specialty</span><select value={specialtyId} onChange={(event) => setSpecialtyId(event.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">All specialties</option>{specialties.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
              <Button type="submit" className="self-end"><Search size={17} /> Find care</Button>
            </form>
          </Card>
          <p className="mt-4 text-xs text-slate-500">Appointments in Asia/Karachi time · No booking fees</p>
        </div>
        <div className="relative animate-rise-in delay-100">
          <div role="img" aria-label="Doctor speaking with a patient in a bright clinic" className="min-h-[330px] overflow-hidden rounded-2xl border bg-cover bg-center shadow-soft sm:min-h-[440px]" style={{ backgroundImage: "linear-gradient(180deg, transparent 55%, rgba(12, 42, 57, .60)), url('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1200&q=85')" }}>
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-[310px]">
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800"><Stethoscope size={19} /></span><div><p className="text-sm font-bold text-slate-900">A better visit begins with a good fit.</p><p className="mt-1 text-xs leading-5 text-slate-600">Explore local specialists and clear availability, all in one place.</p></div></div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-y bg-white/90">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-3 md:gap-8 md:py-12 lg:px-8">
          {assurances.map(({ icon: Icon, title, copy }, index) => <div key={title} className={`flex gap-4 animate-rise-in ${index ? `delay-${index * 100}` : ""}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon size={20} /></span><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{copy}</p></div></div>)}
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div><p className="text-sm font-semibold text-primary">A simpler way to get started</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Care starts with a conversation.</h2></div>
        <Button variant="outline" asChild><Link href="/doctors">Browse all doctors <ArrowRight size={17} /></Link></Button>
      </section>
    </>
  );
}
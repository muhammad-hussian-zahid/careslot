"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const registering = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError("");
    try {
      if (registering) await api.register(email, String(form.get("name")), password);
      else await api.login(email, password);
      toast.success(registering ? "Your account is ready." : "Welcome back.");
      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to continue.";
      setError(message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[.9fr_1.1fr] lg:px-8">
      <div className="mx-auto w-full max-w-md animate-rise-in">
        <p className="text-sm font-bold text-primary">{registering ? "A healthier routine starts here" : "Welcome back to CareSlot"}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{registering ? "Create your account" : "Sign in to your account"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{registering ? "Book and manage your clinic visits in one place." : "Your care plans and upcoming visits are right where you left them."}</p>
        <Card className="mt-7 p-5 sm:p-7">
          <form onSubmit={submit} className="space-y-4">
            {registering && <label className="block"><span className="mb-1.5 block text-sm font-semibold">Full name</span><span className="relative block"><UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input required name="name" minLength={2} maxLength={160} autoComplete="name" placeholder="Your name" className="pl-10" /></span></label>}
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Email address</span><span className="relative block"><Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input required name="email" type="email" autoComplete="email" placeholder="you@example.com" className="pl-10" /></span></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold">Password</span><span className="relative block"><LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input required name="password" type="password" minLength={registering ? 10 : 1} autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "At least 10 characters" : "Your password"} className="pl-10" /></span>{registering && <span className="mt-1 block text-xs text-slate-500">Use at least 10 characters.</span>}</label>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Sign in"}<ArrowRight size={17} /></Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600">{registering ? "Already have an account?" : "New to CareSlot?"} <Link className="font-semibold text-primary hover:underline" href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create an account"}</Link></p>
        </Card>
      </div>
      <div className="hidden min-h-[480px] overflow-hidden rounded-2xl border bg-cover bg-center md:block" role="img" aria-label="Doctor greeting a patient" style={{ backgroundImage: "linear-gradient(180deg, transparent 40%, rgba(12, 42, 57, .56)), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85')" }}>
        <div className="flex h-full min-h-[480px] items-end p-8"><div className="max-w-sm text-white"><p className="text-sm font-semibold text-white/85">Care, with clarity</p><p className="mt-2 text-2xl font-bold leading-tight">Good care is easier when the next step is simple.</p></div></div>
      </div>
    </div>
  );
}
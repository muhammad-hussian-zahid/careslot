"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    api.me().then((user) => router.replace(user.role === "admin" ? "/admin" : user.role === "doctor" ? "/doctor" : "/appointments")).catch(() => router.replace("/login"));
  }, [router]);
  return <div className="mx-auto max-w-7xl px-4 py-10"><div className="h-24 animate-pulse rounded-xl bg-slate-200" aria-label="Loading dashboard" /></div>;
}
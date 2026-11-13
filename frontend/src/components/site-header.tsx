"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, LogOut, Menu, X } from "lucide-react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, [pathname]);

  async function signOut() {
    try { await api.logout(); } finally { setUser(null); window.location.assign("/"); }
  }

  const dashboardPath = user?.role === "doctor" ? "/doctor" : user?.role === "admin" ? "/admin" : "/appointments";
  return (
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CareSlot home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-white"><CalendarDays size={19} aria-hidden="true" /></span>
          <span className="text-[19px] font-bold tracking-tight text-slate-900">CareSlot</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          <Link className="text-sm font-medium text-slate-600 hover:text-primary" href="/doctors">Find a doctor</Link>
          {user && <Link className="text-sm font-medium text-slate-600 hover:text-primary" href={dashboardPath}>{user.role === "patient" ? "My appointments" : "Dashboard"}</Link>}
          {user?.role === "doctor" && <Link className="text-sm font-medium text-slate-600 hover:text-primary" href="/doctor#schedule">My schedule</Link>}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="max-w-40 truncate text-sm font-medium text-slate-600">{user.full_name}</span>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut size={16} aria-hidden="true" /> Sign out</Button>
            </>
          ) : <><Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-primary">Sign in</Link><Button asChild><Link href="/register">Create account</Link></Button></>}
        </div>
        <button className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-secondary md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && <div className="border-t bg-white px-4 py-4 md:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <Link onClick={() => setMenuOpen(false)} className="py-2 text-sm font-medium" href="/doctors">Find a doctor</Link>
          {user ? <><Link onClick={() => setMenuOpen(false)} className="py-2 text-sm font-medium" href={dashboardPath}>My workspace</Link><button onClick={signOut} className="flex items-center gap-2 py-2 text-left text-sm font-medium text-red-700"><LogOut size={16} /> Sign out</button></> : <div className="flex gap-2"><Button variant="outline" asChild className="flex-1"><Link href="/login">Sign in</Link></Button><Button asChild className="flex-1"><Link href="/register">Create account</Link></Button></div>}
        </div>
      </div>}
    </header>
  );
}
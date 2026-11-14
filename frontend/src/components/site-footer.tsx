import Link from "next/link";
import { CalendarDays, HeartPulse } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-slate-950"><span className="grid size-8 place-items-center rounded-lg bg-primary text-white"><CalendarDays size={16} /></span><span className="font-bold">CareSlot</span></Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">A clearer way to find a doctor and make time for care.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-600" aria-label="Footer navigation"><Link href="/doctors" className="hover:text-primary">Find care</Link><Link href="/login" className="hover:text-primary">Sign in</Link><Link href="/register" className="hover:text-primary">Create account</Link></nav>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 md:col-span-2"><HeartPulse size={14} className="text-primary" /> Clinic times are shown in Asia/Karachi · © {new Date().getFullYear()} CareSlot</div>
      </div>
    </footer>
  );
}
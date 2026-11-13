import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/types";

const styles: Record<AppointmentStatus, string> = {
  pending: "bg-warning/15 text-amber-800",
  confirmed: "bg-success/15 text-emerald-800",
  completed: "bg-secondary text-slate-700",
  cancelled: "bg-destructive/10 text-red-700",
  no_show: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize", styles[status])}>{status.replace("_", " ")}</span>;
}
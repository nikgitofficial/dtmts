import { Skeleton } from "@/components/ui/Skeleton";
import { StatIcon, type IconName } from "./icons";

export default function StatCard({
  icon, tone, label, value, hint, percent, loading,
}: {
  icon: IconName;
  /** background colour class for the icon tile, e.g. "bg-green-500" */
  tone: string;
  label: string;
  value: number;
  hint: string;
  /** share of the fleet, shows a % pill and a thin progress bar */
  percent?: number;
  loading: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 place-items-center rounded-xl text-white shadow-sm ring-1 ring-inset ring-black/5 transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${tone}`}>
          <StatIcon name={icon} className="size-6 drop-shadow-sm" />
        </span>
        {percent !== undefined && !loading && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600">{percent}%</span>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <Skeleton className="inline-block h-9 w-14 align-middle" /> : value}
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>

      {percent !== undefined && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100" aria-hidden>
          <div className={`h-full transition-[width] duration-500 motion-reduce:transition-none ${tone}`} style={{ width: loading ? "0%" : `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
import { Icon } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Stat({ icon, label, value, hint, loading }: { icon: string; label: string; value: string; hint: string; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon d={icon} className="size-5" /></span>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <Skeleton className="h-9 w-16" /> : value}
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
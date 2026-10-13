"use client";
import { useState } from "react";
import { btn, ICON, Icon } from "@/components/ui";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import { TableRowsSkeleton } from "@/components/ui/Skeleton";
import { useSessions, type StatusFilter } from "@/hooks/useSessions";
import { PAGE_SIZE } from "@/lib/constants";
import { vehicleLabel } from "@/lib/drivers";
import { deviceTitle, durationOf, fmtDateTime, fmtDuration, fmtKm, osLabel, sessionState } from "@/lib/logs";
import type { Session } from "@/types/session";
import SessionDetails from "./SessionDetails";
import { LOG_ROW_WIDTHS } from "./skeletons";
import Stat from "./Stat";
import StateBadge from "./StateBadge";

const I = {
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  device: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16",
  users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
};

const STATUS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" }, { key: "live", label: "Live" }, { key: "ended", label: "Ended" },
];
const RANGES = [
  { v: 1, label: "Last 24 hours" }, { v: 7, label: "Last 7 days" },
  { v: 30, label: "Last 30 days" }, { v: 0, label: "All time" },
];

export default function LogsView() {
  const s = useSessions();
  const [selected, setSelected] = useState<Session | null>(null);
  const { data, loading, now } = s;
  const summaryLoading = data === null;
  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session logs</h1>
          <p className="mt-1 text-sm text-slate-500">When each driver started and stopped sharing, and from which device.</p>
        </div>
        <a href={`/api/tracking/sessions/export?${s.filterQs}`} className={btn.secondary}>
          <Icon d={I.download} />Export CSV
        </a>
      </div>

      <section aria-label="Summary" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={I.route} label="Sessions" value={String(data?.summary.total ?? 0)} hint="In the selected period" loading={summaryLoading} />
        <Stat icon={I.pulse} label="Live now" value={String(data?.summary.live ?? 0)} hint="Currently sharing location" loading={summaryLoading} />
        <Stat icon={I.users} label="Drivers" value={String(data?.summary.drivers ?? 0)} hint="Shared at least once" loading={summaryLoading} />
        <Stat icon={I.clock} label="Avg. duration" value={data && data.summary.avgSec > 0 ? fmtDuration(data.summary.avgSec) : "—"} hint="Of finished sessions" loading={summaryLoading} />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SearchInput value={s.q} onChange={s.setQ} label="Search logs" placeholder="Search driver, plate, phone, device, IP…" />

        <div role="group" aria-label="Status" className="flex rounded-lg bg-slate-100 p-1">
          {STATUS.map((o) => (
            <button key={o.key} aria-pressed={s.status === o.key} onClick={() => s.setStatus(o.key)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-brand ${s.status === o.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              {o.label}
            </button>
          ))}
        </div>

        <select value={s.days} onChange={(e) => s.setDays(Number(e.target.value))} aria-label="Period"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15">
          {RANGES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
        </select>
      </div>

      {s.error && (
        <p role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {s.error}
          <button onClick={s.reload} className="font-medium underline">Retry</button>
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm" aria-busy={loading}>
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              {["Driver", "Device", "Contact", "Started", "Duration", "Distance", "Status"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <TableRowsSkeleton rows={6} widths={LOG_ROW_WIDTHS} />}

            {!loading && data?.sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-medium text-slate-900">{s.filtered ? "No sessions match your filters" : "No sessions in this period"}</p>
                  <p className="mt-1 text-slate-500">
                    {s.filtered ? "Try a different search or status." : "A session is logged when a driver taps “Start sharing location” in the app."}
                  </p>
                  {s.filtered && <div className="mt-4"><button onClick={s.reset} className={btn.secondary}>Clear filters</button></div>}
                </td>
              </tr>
            )}

            {!loading && data?.sessions.map((row) => {
              const st = sessionState(row, now);
              return (
                <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button type="button" className="block max-w-[14rem] truncate text-left font-medium text-slate-900 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{row.driverName}</button>
                    <div className="text-slate-500">{row.plateNumber}{vehicleLabel(row) ? ` · ${vehicleLabel(row)}` : ""}</div>
                    <div className="text-slate-500">{row.routeFrom} → {row.routeTo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Icon d={I.device} className="size-4 text-slate-400" />
                      <span className="max-w-[12rem] truncate">{deviceTitle(row)}</span>
                    </div>
                    <div className="text-slate-500">{osLabel(row)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <a href={`tel:${row.phone}`} onClick={(e) => e.stopPropagation()} className="text-slate-900 hover:text-brand hover:underline">{row.phone}</a>
                    <div className="font-mono text-xs text-slate-500">{row.ipAddress ?? "IP unknown"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {fmtDateTime(row.startedAt)}
                    <div className="text-slate-500">{row.endedAt ? `Ended ${fmtDateTime(row.endedAt)}` : "In progress"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{fmtDuration(durationOf(row, now))}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {fmtKm(row)}
                    {row.points > 0 && <div className="text-slate-500">{row.points.toLocaleString()} pts</div>}
                  </td>
                  <td className="px-4 py-3"><StateBadge state={st} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={s.page} total={total} pageSize={PAGE_SIZE} onPage={s.setPage} disabled={loading} />

      <p className="mt-6 text-xs text-slate-400">Distance and GPS points come from location history, which is kept for 30 days. Session records are kept longer.</p>

      {selected && <SessionDetails s={selected} now={now} onClose={() => setSelected(null)} />}
    </div>
  );
}
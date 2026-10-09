"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { btn, ICON, Icon } from "@/components/ui";
import { rest } from "@/lib/api";
import { vehicleLabel } from "@/lib/drivers";
import {
  END_REASON_TEXT, SESSION_META, deviceTitle, durationOf, fmtDateTime, fmtDuration, fmtKm, osLabel,
  sessionState, type Session, type SessionsResponse, type SessionState,
} from "@/lib/logs";

const PAGE_SIZE = 20;
const I = {
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  device: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16",
  users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
};

type Status = "all" | "live" | "ended";
const STATUS: { key: Status; label: string }[] = [
  { key: "all", label: "All" }, { key: "live", label: "Live" }, { key: "ended", label: "Ended" },
];
const RANGES = [
  { v: 1, label: "Last 24 hours" }, { v: 7, label: "Last 7 days" },
  { v: 30, label: "Last 30 days" }, { v: 0, label: "All time" },
];

function StateBadge({ state }: { state: SessionState }) {
  const m = SESSION_META[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${m.badge}`}>
      <span className="relative flex size-1.5">
        {state === "live" && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${m.dot}`} />}
        <span className={`relative inline-flex size-1.5 rounded-full ${m.dot}`} />
      </span>
      {m.label}
    </span>
  );
}

function Stat({ icon, label, value, hint, loading }: { icon: string; label: string; value: string; hint: string; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon d={icon} className="size-5" /></span>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" /> : value}
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function LogsPage() {
  const router = useRouter();
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Session | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);

  const filterQs = useMemo(() => new URLSearchParams({ q: dq, status, days: String(days) }), [dq, status, days]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    try {
      const qs = new URLSearchParams(filterQs);
      qs.set("page", String(page));
      qs.set("limit", String(PAGE_SIZE));
      const d = await rest<SessionsResponse>(`/tracking/sessions?${qs}`);
      if (id !== reqId.current) return;
      if (d.sessions.length === 0 && page > 1) { setPage(page - 1); return; }
      setData(d);
      setNow(Date.now());
      setError("");
    } catch (e) {
      if (id !== reqId.current) return;
      if ((e as Error).message === "Unauthorized") router.replace("/login");
      else setError((e as Error).message);
    }
  }, [filterQs, page, router]);

  // load now, then refresh quietly so live sessions stay current
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const loading = data === null;
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtered = dq !== "" || status !== "all";
  const reset = () => { setQ(""); setDq(""); setStatus("all"); setPage(1); };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session logs</h1>
          <p className="mt-1 text-sm text-slate-500">When each driver started and stopped sharing, and from which device.</p>
        </div>
        <a href={`/api/tracking/sessions/export?${filterQs}`} className={btn.secondary}>
          <Icon d={I.download} />Export CSV
        </a>
      </div>

      <section aria-label="Summary" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={I.route} label="Sessions" value={String(data?.summary.total ?? 0)} hint="In the selected period" loading={loading} />
        <Stat icon={I.pulse} label="Live now" value={String(data?.summary.live ?? 0)} hint="Currently sharing location" loading={loading} />
        <Stat icon={I.users} label="Drivers" value={String(data?.summary.drivers ?? 0)} hint="Shared at least once" loading={loading} />
        <Stat icon={I.clock} label="Avg. duration" value={data && data.summary.avgSec > 0 ? fmtDuration(data.summary.avgSec) : "—"} hint="Of finished sessions" loading={loading} />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Icon d={ICON.search} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search logs"
            placeholder="Search driver, plate, phone, device, IP…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-brand">
              <Icon d={ICON.x} />
            </button>
          )}
        </div>

        <div role="group" aria-label="Status" className="flex rounded-lg bg-slate-100 p-1">
          {STATUS.map((s) => (
            <button key={s.key} aria-pressed={status === s.key} onClick={() => { setStatus(s.key); setPage(1); }}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-brand ${status === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }} aria-label="Period"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15">
          {RANGES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              {["Driver", "Device", "Contact", "Started", "Duration", "Distance", "Status"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-10 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" /></td></tr>
            ))}

            {data?.sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-medium text-slate-900">{filtered ? "No sessions match your filters" : "No sessions in this period"}</p>
                  <p className="mt-1 text-slate-500">
                    {filtered ? "Try a different search or status." : "A session is logged when a driver taps “Start sharing location” in the app."}
                  </p>
                  {filtered && <div className="mt-4"><button onClick={reset} className={btn.secondary}>Clear filters</button></div>}
                </td>
              </tr>
            )}

            {data?.sessions.map((s) => {
              const st = sessionState(s, now);
              return (
                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button type="button" className="block max-w-[14rem] truncate text-left font-medium text-slate-900 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{s.driverName}</button>
                    <div className="text-slate-500">{s.plateNumber}{vehicleLabel(s) ? ` · ${vehicleLabel(s)}` : ""}</div>
                    <div className="text-slate-500">{s.routeFrom} → {s.routeTo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <Icon d={I.device} className="size-4 text-slate-400" />
                      <span className="max-w-[12rem] truncate">{deviceTitle(s)}</span>
                    </div>
                    <div className="text-slate-500">{osLabel(s)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <a href={`tel:${s.phone}`} onClick={(e) => e.stopPropagation()} className="text-slate-900 hover:text-brand hover:underline">{s.phone}</a>
                    <div className="font-mono text-xs text-slate-500">{s.ipAddress ?? "IP unknown"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {fmtDateTime(s.startedAt)}
                    <div className="text-slate-500">{s.endedAt ? `Ended ${fmtDateTime(s.endedAt)}` : "In progress"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{fmtDuration(durationOf(s, now))}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {fmtKm(s)}
                    {s.points > 0 && <div className="text-slate-500">{s.points.toLocaleString()} pts</div>}
                  </td>
                  <td className="px-4 py-3"><StateBadge state={st} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>Showing {from}–{to} of {total}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btn.smSecondary}><Icon d={ICON.left} />Previous</button>
            <span className="tabular-nums">Page {page} of {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={btn.smSecondary}>Next<Icon d={ICON.right} /></button>
          </div>
        </nav>
      )}

      <p className="mt-6 text-xs text-slate-400">Distance and GPS points come from location history, which is kept for 30 days. Session records are kept longer.</p>

      {selected && <SessionDetails s={selected} now={now} onClose={() => setSelected(null)} />}
    </main>
  );
}

function Section({ title, items }: { title: string; items: [string, React.ReactNode][] }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {items.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-slate-500">{k}</dt>
            <dd className="mt-0.5 break-words font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SessionDetails({ s, now, onClose }: { s: Session; now: number; onClose: () => void }) {
  const st = sessionState(s, now);
  const dash = (v: string | null) => v || "—";
  return (
    <Modal title={s.driverName} description={`${s.plateNumber} · ${s.routeFrom} → ${s.routeTo}`} size="lg" onClose={onClose}>
      <div className="flex items-center gap-3"><StateBadge state={st} /><span className="text-sm text-slate-500">{fmtDuration(durationOf(s, now))}</span></div>

      <div className="mt-5 space-y-6 border-t border-slate-100 pt-5">
        <Section title="Session" items={[
          ["Started", fmtDateTime(s.startedAt)],
          ["Ended", s.endedAt ? fmtDateTime(s.endedAt) : "In progress"],
          ["How it ended", s.endedAt && s.endReason ? END_REASON_TEXT[s.endReason] : "—"],
          ["Distance", fmtKm(s)],
          ["Top speed", s.maxSpeed != null && s.points > 0 ? `${Math.round(s.maxSpeed * 3.6)} km/h` : "—"],
          ["GPS points", s.points > 0 ? s.points.toLocaleString() : "—"],
        ]} />
        <Section title="Truck & route" items={[
          ["Truck", vehicleLabel(s) || "—"],
          ["Plate number", s.plateNumber],
          ["Start", s.routeFrom],
          ["Destination", s.routeTo],
        ]} />
        <Section title="Device" items={[
          ["Model", deviceTitle(s)],
          ["Device name", dash(s.deviceName)],
          ["Operating system", osLabel(s)],
          ["App version", dash(s.appVersion)],
          ["IP address", <span key="ip" className="font-mono text-[13px]">{s.ipAddress ?? "—"}</span>],
        ]} />
        <Section title="Driver contact" items={[
          ["Mobile number", <a key="p" href={`tel:${s.phone}`} className="text-brand hover:underline">{s.phone}</a>],
          ["Email", <a key="e" href={`mailto:${s.email}`} className="break-all text-brand hover:underline">{s.email}</a>],
        ]} />
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button type="button" data-autofocus onClick={onClose} className={btn.secondary}>Close</button>
        <Link href="/dashboard/tracking" className={btn.primary}>Open live tracking</Link>
      </div>
    </Modal>
  );
}
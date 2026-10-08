"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useUser } from "@/components/DashboardShell";
import { rest } from "@/lib/api";
import { POLL_MS, STATE_META, ageOf, stateOf, type LiveDriver, type TrackState } from "@/lib/tracking";

/* ── Icons (24×24 line icons) ── */
const ICONS = {
  users: (
    <>
      <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8" />
    </>
  ),
  userCheck: (
    <>
      <path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="m16.5 11 2 2 3.5-4" />
    </>
  ),
  truck: (
    <>
      <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </>
  ),
  signalOff: (
    <>
      <path d="M7 20v-4M12 20v-8M17 20V9" />
      <path d="M3 3l18 18" />
    </>
  ),
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M6.4 6.6a8 8 0 1 0 11.2 0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

type IconName = keyof typeof ICONS;

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

const STATES: { key: TrackState; label: string; hint: string; icon: IconName }[] = [
  { key: "moving", label: "Running", hint: "On the road now", icon: "truck" },
  { key: "idle", label: "Stopped", hint: "Parked, GPS signal OK", icon: "pause" },
  { key: "stale", label: "Signal lost", hint: "No recent GPS update", icon: "signalOff" },
  { key: "offline", label: "Offline", hint: "Not sharing location", icon: "power" },
];

function useLive() {
  const router = useRouter();
  const [data, setData] = useState<{ drivers: LiveDriver[]; fetchedAt: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stop) return;
      if (!document.hidden) {
        try {
          const r = await rest<{ drivers: LiveDriver[] }>("/tracking/live");
          if (!stop) { setData({ drivers: r.drivers, fetchedAt: Date.now() }); setError(""); }
        } catch (e) {
          if ((e as Error).message === "Unauthorized") { router.replace("/login"); return; }
          if (!stop) setError("Connection lost. Retrying…");
        }
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [router]);

  return { data, error };
}

export default function Dashboard() {
  const user = useUser();
  const { data, error } = useLive();
  const [now, setNow] = useState(() => Date.now());

  // re-evaluate truck states (a truck can turn "signal lost" between polls)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

  const stats = useMemo(() => {
    const counts: Record<TrackState, number> = { moving: 0, idle: 0, stale: 0, offline: 0 };
    const list = data?.drivers ?? [];
    let active = 0;
    for (const d of list) {
      counts[stateOf(d, ageOf(d, data!.fetchedAt, now))]++;
      if (d.status === "active") active++;
    }
    return { total: list.length, active, inactive: list.length - active, counts };
  }, [data, now]);

  const loading = data === null;
  const sinceUpdate = data ? Math.max(0, Math.floor((now - data.fetchedAt) / 1000)) : null;
  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hi, {user.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Here's what your fleet is doing right now.</p>
        </div>
        <div role="status" className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
          {error ? (
            <><span className="size-2 rounded-full bg-red-500" />{error}</>
          ) : data ? (
            <>
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              Live · updated {sinceUpdate! < 2 ? "just now" : `${sinceUpdate}s ago`}
            </>
          ) : "Connecting…"}
        </div>
      </div>

      <section aria-label="Fleet summary" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon="users" tone="bg-slate-500" label="Total drivers" value={stats.total}
          hint="Registered trucks and drivers" loading={loading}
        />
        <StatCard
          icon="userCheck" tone="bg-brand" label="Active drivers" value={stats.active}
          hint={`${stats.inactive} inactive`} percent={pct(stats.active)} loading={loading}
        />
        {STATES.map((s) => (
          <StatCard
            key={s.key} icon={s.icon} tone={STATE_META[s.key].dot} label={s.label}
            value={stats.counts[s.key]} hint={s.hint} percent={pct(stats.counts[s.key])} loading={loading}
          />
        ))}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Fleet status</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/tracking"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <Icon name="pin" className="size-4" />
              Open live tracking
            </Link>
            <Link
              href="/dashboard/drivers"
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Icon name="users" className="size-4" />
              Manage drivers
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 h-3 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
        ) : stats.total === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No drivers yet. <Link href="/dashboard/drivers/new" className="font-medium text-brand hover:underline">Register a driver</Link> to start tracking.
          </p>
        ) : (
          <>
            <div
              role="img"
              aria-label={STATES.map((s) => `${stats.counts[s.key]} ${s.label.toLowerCase()}`).join(", ")}
              className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100"
            >
              {STATES.map((s) =>
                stats.counts[s.key] > 0 ? (
                  <div key={s.key} className={STATE_META[s.key].dot} style={{ width: `${(stats.counts[s.key] / stats.total) * 100}%` }} />
                ) : null,
              )}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {STATES.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${STATE_META[s.key].dot}`} />
                  {s.label}
                  <span className="font-medium tabular-nums text-slate-900">{stats.counts[s.key]}</span>
                  <span className="tabular-nums text-slate-400">{pct(stats.counts[s.key])}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({
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
          <Icon name={icon} className="size-6 drop-shadow-sm" />
        </span>
        {percent !== undefined && !loading && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-600">{percent}%</span>
        )}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <span className="inline-block h-9 w-14 animate-pulse rounded-md bg-slate-100 align-middle motion-reduce:animate-none" /> : value}
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
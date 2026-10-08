"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/components/DashboardShell";
import { rest } from "@/lib/api";
import { POLL_MS, STATE_META, ageOf, stateOf, type LiveDriver, type TrackState } from "@/lib/tracking";

const STATES: { key: TrackState; label: string; hint: string }[] = [
  { key: "moving", label: "Running", hint: "On the road now" },
  { key: "idle", label: "Stopped", hint: "Parked, GPS signal OK" },
  { key: "stale", label: "Signal lost", hint: "No recent GPS update" },
  { key: "offline", label: "Offline", hint: "Not sharing location" },
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Here's what your fleet is doing right now.</p>
        </div>
        <div role="status" className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
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
        <StatCard label="Total drivers" value={stats.total} hint="Registered trucks and drivers" dot="bg-slate-400" loading={loading} />
        <StatCard label="Active drivers" value={stats.active} hint={`${stats.inactive} inactive`} dot="bg-brand" loading={loading} />
        {STATES.map((s) => (
          <StatCard key={s.key} label={s.label} value={stats.counts[s.key]} hint={s.hint} dot={STATE_META[s.key].dot} loading={loading} />
        ))}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Fleet status</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/tracking" className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110">Open live tracking</Link>
            <Link href="/dashboard/drivers" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">Manage drivers</Link>
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
                  <span className="tabular-nums text-slate-400">{Math.round((stats.counts[s.key] / stats.total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, hint, dot, loading }: { label: string; value: number; hint: string; dot: string; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className={`size-2.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <span className="inline-block h-9 w-14 animate-pulse rounded-md bg-slate-100 align-middle motion-reduce:animate-none" /> : value}
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useUser } from "@/context/user";
import { useLiveDrivers } from "@/hooks/useLiveDrivers";
import { useNow } from "@/hooks/useNow";
import { STATE_META, ageOf, stateOf } from "@/lib/tracking";
import type { TrackState } from "@/types/tracking";
import LiveStatus from "@/components/features/tracking/LiveStatus";
import { StatIcon, type IconName } from "./icons";
import StatCard from "./StatCard";

const STATES: { key: TrackState; label: string; hint: string; icon: IconName }[] = [
  { key: "moving", label: "Running", hint: "On the road now", icon: "truck" },
  { key: "idle", label: "Stopped", hint: "Parked, GPS signal OK", icon: "pause" },
  { key: "stale", label: "Signal lost", hint: "No recent GPS update", icon: "signalOff" },
  { key: "offline", label: "Offline", hint: "Not sharing location", icon: "power" },
];

export default function DashboardView() {
  const user = useUser();
  const { data, error } = useLiveDrivers();
  // re-evaluate truck states (a truck can turn "signal lost" between polls)
  const now = useNow(5000);

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
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hi, {user.name}</h1>
          <p className="mt-1 text-sm text-slate-600">Here&apos;s what your fleet is doing right now.</p>
        </div>
        <div className="rounded-full bg-white px-3.5 py-1.5 shadow-sm ring-1 ring-slate-200">
          <LiveStatus error={error} connected={!!data} since={sinceUpdate} />
        </div>
      </div>

      <section aria-label="Fleet summary" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon="users" tone="bg-slate-500" label="Total drivers" value={stats.total} hint="Registered trucks and drivers" loading={loading} />
        <StatCard icon="userCheck" tone="bg-brand" label="Active drivers" value={stats.active} hint={`${stats.inactive} inactive`} percent={pct(stats.active)} loading={loading} />
        {STATES.map((s) => (
          <StatCard key={s.key} icon={s.icon} tone={STATE_META[s.key].dot} label={s.label} value={stats.counts[s.key]} hint={s.hint} percent={pct(stats.counts[s.key])} loading={loading} />
        ))}
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Fleet status</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/tracking" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              <StatIcon name="pin" className="size-4" />Open live tracking
            </Link>
            <Link href="/dashboard/drivers" className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              <StatIcon name="users" className="size-4" />Manage drivers
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-4" role="status" aria-busy="true">
            <span className="sr-only">Loading fleet status…</span>
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex gap-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" /></div>
          </div>
        ) : stats.total === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No drivers yet. <Link href="/dashboard/drivers" className="font-medium text-brand hover:underline">Register a driver</Link> to start tracking.
          </p>
        ) : (
          <>
            <div role="img" aria-label={STATES.map((s) => `${stats.counts[s.key]} ${s.label.toLowerCase()}`).join(", ")} className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {STATES.map((s) => stats.counts[s.key] > 0 ? (
                <div key={s.key} className={STATE_META[s.key].dot} style={{ width: `${(stats.counts[s.key] / stats.total) * 100}%` }} />
              ) : null)}
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
    </div>
  );
}
"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ListRowsSkeleton, MapSkeleton } from "@/components/ui/Skeleton";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useLiveDrivers } from "@/hooks/useLiveDrivers";
import { useNow } from "@/hooks/useNow";
import { useTrail } from "@/hooks/useTrail";
import { STATE_META, STATE_ORDER, ageOf, stateOf, statusText } from "@/lib/tracking";
import type { TrackRow, TrackState } from "@/types/tracking";
import DriverSelect from "./DriverSelect";
import LiveStatus from "./LiveStatus";
import TruckDetails, { StateBadge } from "./TruckDetails";

// Leaflet needs `window`, so the map is client-only and code-split out of the main bundle.
const TrackingMap = dynamic(() => import("./TrackingMap"), { ssr: false, loading: () => <MapSkeleton /> });

type Filter = "all" | TrackState;

function FullscreenIcon({ full }: { full: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden>
      <path d={full ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"} />
    </svg>
  );
}

export default function TrackingView() {
  const { data, error } = useLiveDrivers();
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [hours, setHours] = useState(6);
  const [fitSignal, setFitSignal] = useState(0);
  const [routeFit, setRouteFit] = useState(0);
  const mapBox = useRef<HTMLElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(mapBox);
  const { trail, loading: trailLoading } = useTrail(selectedId, hours);

  const rows: TrackRow[] = useMemo(() =>
    (data?.drivers ?? []).map((d) => {
      const age = ageOf(d, data!.fetchedAt, now);
      return { d, age, state: stateOf(d, age) };
    }).sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.d.name.localeCompare(b.d.name)),
  [data, now]);

  const counts = useMemo(() => {
    const c: Record<TrackState, number> = { moving: 0, idle: 0, stale: 0, offline: 0 };
    rows.forEach((r) => c[r.state]++);
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) =>
      (filter === "all" || r.state === filter) &&
      (!s || `${r.d.name} ${r.d.plateNumber} ${r.d.routeFrom} ${r.d.routeTo}`.toLowerCase().includes(s)));
  }, [rows, filter, q]);

  const selected = rows.find((r) => r.d.id === selectedId) ?? null;
  const loading = data === null;
  const select = (id: string | null) => { setSelectedId(id); if (!id) setFollow(false); };
  const sinceUpdate = data ? Math.max(0, Math.floor((now - data.fetchedAt) / 1000)) : null;

  const chips: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "All", n: rows.length },
    { key: "moving", label: "Moving", n: counts.moving },
    { key: "idle", label: "Stopped", n: counts.idle },
    { key: "stale", label: "Signal lost", n: counts.stale },
    { key: "offline", label: "Offline", n: counts.offline },
  ];

  return (
    <div className="flex h-[calc(100dvh-3.8125rem)] flex-col bg-slate-50 lg:h-dvh">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
          <h1 className="text-lg font-semibold tracking-tight">Live tracking</h1>
        </div>
        <LiveStatus error={error} connected={!loading} since={sinceUpdate} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 flex min-h-0 flex-1 flex-col border-t border-slate-200 bg-white lg:order-1 lg:w-[380px] lg:flex-none lg:border-r lg:border-t-0">
          <div className="space-y-3 border-b border-slate-100 p-4">
            <DriverSelect rows={rows} selectedId={selectedId} onChange={select} loading={loading} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, plate, route…" aria-label="Search trucks"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c.key} onClick={() => setFilter(c.key)} aria-pressed={filter === c.key}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${filter === c.key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"}`}>
                  {c.label} <span className={filter === c.key ? "text-slate-300" : "text-slate-400"}>{c.n}</span>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <TruckDetails
              row={selected} follow={follow} onFollow={setFollow} hours={hours} onHours={setHours}
              trailLoading={trailLoading} onShowRoute={() => setRouteFit((n) => n + 1)} onClose={() => select(null)}
            />
          )}

          <ul className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
            {loading && <ListRowsSkeleton rows={6} />}
            {data && rows.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                No drivers yet. <Link href="/dashboard/drivers" className="font-medium text-brand hover:underline">Register a driver</Link> to start tracking.
              </li>
            )}
            {data && rows.length > 0 && visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No trucks match this filter.</li>}
            {visible.map(({ d, age, state }) => (
              <li key={d.id}>
                <button onClick={() => select(d.id)} aria-pressed={d.id === selectedId}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${d.id === selectedId ? "bg-brand/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="truncate text-xs text-slate-500">{d.plateNumber} · {d.routeFrom} → {d.routeTo}</div>
                    </div>
                    <StateBadge state={state} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{statusText(d, age, state)}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* The map. When `full` is on it covers the whole screen (sidebar and list included). */}
        <section
          ref={mapBox}
          aria-label="Map"
          className={full ? "fixed inset-0 z-[60] bg-slate-100" : "relative order-1 h-[50dvh] lg:order-2 lg:h-auto lg:flex-1"}
        >
          <TrackingMap
            rows={visible.map(({ d, state }) => ({ d, state }))}
            selectedId={selectedId} trail={trail} follow={follow} fitSignal={fitSignal} routeFit={routeFit} onSelect={select}
          />

          {/* In full screen the side panel is hidden, so the live status and driver dropdown live on the map */}
          {full && (
            <div className="absolute left-3 top-3 z-[1000] flex w-72 max-w-[calc(100%-11rem)] flex-col gap-2">
              <div className="w-fit rounded-full bg-white/95 px-3 py-1.5 shadow-md ring-1 ring-slate-200">
                <LiveStatus error={error} connected={!loading} since={sinceUpdate} />
              </div>
              <DriverSelect rows={rows} selectedId={selectedId} onChange={select} loading={loading} className="shadow-md" />
            </div>
          )}

          <div className="absolute right-3 top-3 z-[1000] flex flex-col items-stretch gap-2">
            <button onClick={toggleFull} aria-pressed={full} aria-label={full ? "Exit full screen" : "Enter full screen"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">
              <FullscreenIcon full={full} />
              {full ? "Exit full screen" : "Full screen"}
            </button>
            <button onClick={() => setFitSignal((n) => n + 1)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-md ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">Show all trucks</button>
          </div>

          <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2">
            {/* In full screen the side panel is hidden, so show the selected truck here */}
            {full && selected && (
              <div className="w-72 max-w-full rounded-xl bg-white/95 p-3 shadow-md ring-1 ring-slate-200 backdrop-blur" aria-label="Selected truck">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{selected.d.name}</div>
                    <div className="truncate text-xs text-slate-500">{selected.d.plateNumber} · {selected.d.routeFrom} → {selected.d.routeTo}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StateBadge state={selected.state} />
                    <button onClick={() => select(null)} aria-label="Close details" className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-600">{statusText(selected.d, selected.age, selected.state)}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">
                    <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
                    Follow
                  </label>
                  {selected.d.routeFromLat != null && selected.d.routeToLat != null ? (
                    <button onClick={() => setRouteFit((n) => n + 1)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-slate-50">Show route</button>
                  ) : (
                    <span className="text-xs text-amber-700">Route not pinned on map</span>
                  )}
                  <a href={`tel:${selected.d.phone}`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-slate-50">Call</a>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-2 text-xs shadow-md ring-1 ring-slate-200">
              {(Object.keys(STATE_META) as TrackState[]).map((k) => (
                <span key={k} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${STATE_META[k].dot}`} />{STATE_META[k].label}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
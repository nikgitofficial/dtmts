"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { rest } from "@/lib/api";
import {
  POLL_MS, STATE_META, STATE_ORDER, ageOf, compass, formatAgo, kmh, stateOf,
  type LiveDriver, type TrackState, type TrailPoint,
} from "@/lib/tracking";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-slate-500">Loading map…</div>,
});

type Filter = "all" | TrackState;

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

function Badge({ state }: { state: TrackState }) {
  const m = STATE_META[state];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${m.badge}`}>{m.label}</span>;
}

export default function TrackingPage() {
  const { data, error } = useLive();
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [hours, setHours] = useState(6);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [fitSignal, setFitSignal] = useState(0);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const rows = useMemo(() =>
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

  useEffect(() => {
    if (!selectedId) { setTrail([]); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const r = await rest<{ points: TrailPoint[] }>(`/tracking/${selectedId}/history?hours=${hours}`);
        if (!cancelled) setTrail(r.points);
      } catch { /* keep the previous trail */ }
    };
    setTrail([]);
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [selectedId, hours]);

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
    <div className="flex h-dvh flex-col bg-slate-50">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
          <h1 className="text-lg font-semibold tracking-tight">Live tracking</h1>
        </div>
        <div role="status" className="flex items-center gap-2 text-sm text-slate-600">
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
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="order-2 flex min-h-0 flex-1 flex-col border-t border-slate-200 bg-white lg:order-1 lg:w-[380px] lg:flex-none lg:border-r lg:border-t-0">
          <div className="space-y-3 border-b border-slate-100 p-4">
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
            <section className="space-y-3 border-b border-slate-200 bg-slate-50 p-4" aria-label="Selected truck">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{selected.d.name}</div>
                  <div className="text-sm text-slate-500">{selected.d.plateNumber}{selected.d.vehicleType ? ` · ${selected.d.vehicleType}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge state={selected.state} />
                  <button onClick={() => select(null)} aria-label="Close details" className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-200">✕</button>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-slate-500">Route</dt><dd className="font-medium">{selected.d.routeFrom} → {selected.d.routeTo}</dd></div>
                <div><dt className="text-slate-500">Capacity</dt><dd className="font-medium">{selected.d.capacityKg.toLocaleString()} kg</dd></div>
                <div><dt className="text-slate-500">Speed</dt><dd className="font-medium">{selected.state === "moving" ? `${kmh(selected.d.speed)} km/h` : "0 km/h"}</dd></div>
                <div><dt className="text-slate-500">Heading</dt><dd className="font-medium">{selected.state === "moving" && selected.d.heading != null ? `${compass(selected.d.heading)} · ${Math.round(selected.d.heading)}°` : "—"}</dd></div>
                <div><dt className="text-slate-500">Last update</dt><dd className="font-medium">{selected.d.recordedAt ? formatAgo(selected.age) : "No location yet"}</dd></div>
                <div><dt className="text-slate-500">GPS accuracy</dt><dd className="font-medium">{selected.d.accuracy != null ? `±${Math.round(selected.d.accuracy)} m` : "—"}</dd></div>
                {selected.d.lat != null && selected.d.lng != null && (
                  <div className="col-span-2"><dt className="text-slate-500">Coordinates</dt>
                    <dd className="font-mono text-xs">{selected.d.lat.toFixed(5)}, {selected.d.lng.toFixed(5)}</dd></div>
                )}
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">
                  <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
                  Follow
                </label>
                <select value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Trail length"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">
                  <option value={1}>Trail: 1 h</option><option value={6}>Trail: 6 h</option>
                  <option value={24}>Trail: 24 h</option><option value={48}>Trail: 48 h</option>
                </select>
                {selected.d.lat != null && (
                  <a href={`https://www.google.com/maps?q=${selected.d.lat},${selected.d.lng}`} target="_blank" rel="noreferrer"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-white">Open in Maps</a>
                )}
                <a href={`tel:${selected.d.phone}`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-white">Call</a>
              </div>
            </section>
          )}

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {data === null && <li className="px-4 py-8 text-center text-sm text-slate-500">Loading trucks…</li>}
            {data && rows.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                No drivers yet. <Link href="/dashboard/drivers/new" className="font-medium text-brand hover:underline">Register a driver</Link> to start tracking.
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
                    <Badge state={state} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {state === "moving" && `${kmh(d.speed)} km/h · ${formatAgo(age)}`}
                    {state === "idle" && `Stopped · updated ${formatAgo(age)}`}
                    {state === "stale" && (d.lat == null ? "Waiting for first GPS fix" : `No signal for ${formatAgo(age).replace(" ago", "")}`)}
                    {state === "offline" && (d.recordedAt ? `Last seen ${formatAgo(age)}` : "Has not shared location yet")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="relative order-1 h-[50dvh] lg:order-2 lg:h-auto lg:flex-1">
          <TrackingMap
            rows={visible.map(({ d, state }) => ({ d, state }))}
            selectedId={selectedId} trail={trail} follow={follow} fitSignal={fitSignal} onSelect={select}
          />
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
            <button onClick={() => setFitSignal((n) => n + 1)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-md ring-1 ring-slate-200 hover:bg-slate-50">Show all trucks</button>
          </div>
          <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-2 text-xs shadow-md ring-1 ring-slate-200">
            {(Object.keys(STATE_META) as TrackState[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${STATE_META[k].dot}`} />{STATE_META[k].label}</span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
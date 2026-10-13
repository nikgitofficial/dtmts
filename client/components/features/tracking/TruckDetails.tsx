import { Skeleton } from "@/components/ui/Skeleton";
import { vehicleLabel } from "@/lib/drivers";
import { STATE_META, compass, formatAgo, kmh } from "@/lib/tracking";
import type { TrackRow, TrackState } from "@/types/tracking";

export function StateBadge({ state }: { state: TrackState }) {
  const m = STATE_META[state];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${m.badge}`}>{m.label}</span>;
}

/** Sidebar panel for the selected truck. */
export default function TruckDetails({
  row, follow, onFollow, hours, onHours, trailLoading, onShowRoute, onClose,
}: {
  row: TrackRow;
  follow: boolean;
  onFollow: (v: boolean) => void;
  hours: number;
  onHours: (h: number) => void;
  trailLoading: boolean;
  onShowRoute: () => void;
  onClose: () => void;
}) {
  const { d, age, state } = row;
  return (
    <section className="space-y-3 border-b border-slate-200 bg-slate-50 p-4" aria-label="Selected truck">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{d.name}</div>
          <div className="text-sm text-slate-500">{d.plateNumber}{vehicleLabel(d) ? ` · ${vehicleLabel(d)}` : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <StateBadge state={state} />
          <button onClick={onClose} aria-label="Close details" className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-200">✕</button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div><dt className="text-slate-500">Route</dt><dd className="font-medium">{d.routeFrom} → {d.routeTo}</dd></div>
        <div><dt className="text-slate-500">Capacity</dt><dd className="font-medium">{d.capacityKg.toLocaleString()} kg</dd></div>
        <div><dt className="text-slate-500">Speed</dt><dd className="font-medium">{state === "moving" ? `${kmh(d.speed)} km/h` : "0 km/h"}</dd></div>
        <div><dt className="text-slate-500">Heading</dt><dd className="font-medium">{state === "moving" && d.heading != null ? `${compass(d.heading)} · ${Math.round(d.heading)}°` : "—"}</dd></div>
        <div><dt className="text-slate-500">Last update</dt><dd className="font-medium">{d.recordedAt ? formatAgo(age) : "No location yet"}</dd></div>
        <div><dt className="text-slate-500">GPS accuracy</dt><dd className="font-medium">{d.accuracy != null ? `±${Math.round(d.accuracy)} m` : "—"}</dd></div>
        {d.lat != null && d.lng != null && (
          <div className="col-span-2"><dt className="text-slate-500">Coordinates</dt>
            <dd className="font-mono text-xs">{d.lat.toFixed(5)}, {d.lng.toFixed(5)}</dd></div>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">
          <input type="checkbox" checked={follow} onChange={(e) => onFollow(e.target.checked)} />
          Follow
        </label>
        <select value={hours} onChange={(e) => onHours(Number(e.target.value))} aria-label="Trail length" className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300">
          <option value={1}>Trail: 1 h</option><option value={6}>Trail: 6 h</option>
          <option value={24}>Trail: 24 h</option><option value={48}>Trail: 48 h</option>
        </select>
        {trailLoading && <Skeleton className="h-4 w-16" />}
        {d.routeFromLat != null && d.routeToLat != null ? (
          <button onClick={onShowRoute} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-white">Show route</button>
        ) : (
          <span className="text-xs text-amber-700">Route not pinned on map</span>
        )}
        {d.lat != null && (
          <a href={`https://www.google.com/maps?q=${d.lat},${d.lng}`} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-white">Open in Maps</a>
        )}
        <a href={`tel:${d.phone}`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-slate-300 hover:bg-white">Call</a>
      </div>
    </section>
  );
}
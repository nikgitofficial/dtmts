export type LiveDriver = {
  id: string; name: string; phone: string; plateNumber: string; vehicleType: string | null;
  routeFrom: string; routeTo: string; capacityKg: number; status: "active" | "inactive";
  sharing: boolean; sharingSince: string | null;
  lat: number | null; lng: number | null; accuracy: number | null;
  speed: number | null; heading: number | null; recordedAt: string | null; ageSec: number | null;
};
export type TrailPoint = { lat: number; lng: number; speed: number | null; recordedAt: string };

export type TrackState = "moving" | "idle" | "stale" | "offline";

export const POLL_MS = 5_000;
export const STALE_AFTER_SEC = 60;   // sharing, but no fix for this long → "signal lost"
export const MOVING_MPS = 1;         // ≈ 3.6 km/h

export const STATE_META: Record<TrackState, { label: string; color: string; badge: string; dot: string }> = {
  moving:  { label: "Moving",      color: "#16a34a", badge: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  idle:    { label: "Stopped",     color: "#d97706", badge: "bg-amber-50 text-amber-700",  dot: "bg-amber-500" },
  stale:   { label: "Signal lost", color: "#dc2626", badge: "bg-red-50 text-red-700",      dot: "bg-red-500" },
  offline: { label: "Offline",     color: "#64748b", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};
export const STATE_ORDER: Record<TrackState, number> = { moving: 0, idle: 1, stale: 2, offline: 3 };

export function ageOf(d: LiveDriver, fetchedAt: number, now: number): number | null {
  return d.ageSec == null ? null : d.ageSec + Math.max(0, (now - fetchedAt) / 1000);
}

export function stateOf(d: LiveDriver, age: number | null): TrackState {
  if (!d.sharing) return "offline";
  if (age == null || age > STALE_AFTER_SEC) return "stale";
  return (d.speed ?? 0) >= MOVING_MPS ? "moving" : "idle";
}

export function formatAgo(sec: number | null): string {
  if (sec == null) return "—";
  const s = Math.max(0, Math.floor(sec));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export const kmh = (mps: number | null) => (mps == null ? 0 : Math.round(mps * 3.6));
export const compass = (deg: number) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
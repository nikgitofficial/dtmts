export type Session = {
  id: string; driverId: string; driverName: string; phone: string; email: string;
  plateNumber: string; vehicleBrand: string | null; vehicleType: string | null; routeFrom: string; routeTo: string;
  startedAt: string; endedAt: string | null; endReason: "driver" | "replaced" | "timeout" | null;
  deviceName: string | null; deviceBrand: string | null; deviceModel: string | null;
  osName: string | null; osVersion: string | null; appVersion: string | null; ipAddress: string | null;
  durationSec: number; points: number; distanceKm: number; maxSpeed: number | null; lastSeenAt: string | null;
};
export type Summary = { total: number; live: number; drivers: number; avgSec: number };
export type SessionsResponse = { sessions: Session[]; total: number; summary: Summary };

export type SessionState = "live" | "nosignal" | "completed" | "timeout" | "restarted";

export const SESSION_META: Record<SessionState, { label: string; badge: string; dot: string }> = {
  live:      { label: "Live",        badge: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  nosignal:  { label: "No signal",   badge: "bg-amber-50 text-amber-700",  dot: "bg-amber-500" },
  completed: { label: "Completed",   badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  timeout:   { label: "Signal lost", badge: "bg-red-50 text-red-700",      dot: "bg-red-500" },
  restarted: { label: "Restarted",   badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

export const END_REASON_TEXT = {
  driver: "Stopped by driver",
  replaced: "Restarted by driver",
  timeout: "No GPS signal for 30 min",
} as const;

export function sessionState(s: Session, now: number): SessionState {
  if (!s.endedAt) {
    const ref = Math.max(Date.parse(s.startedAt), s.lastSeenAt ? Date.parse(s.lastSeenAt) : 0);
    return now - ref > 60_000 ? "nosignal" : "live";
  }
  return s.endReason === "timeout" ? "timeout" : s.endReason === "replaced" ? "restarted" : "completed";
}

export const durationOf = (s: Session, now: number) =>
  s.endedAt ? s.durationSec : Math.max(0, (now - Date.parse(s.startedAt)) / 1000);

export function fmtDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export const deviceTitle = (s: Session) =>
  [s.deviceBrand, s.deviceModel].filter(Boolean).join(" ") || s.deviceName || "Unknown device";
export const osLabel = (s: Session) => [s.osName, s.osVersion].filter(Boolean).join(" ") || "—";
export const fmtKm = (s: Session) => (s.points > 0 ? `${s.distanceKm.toFixed(1)} km` : "—");
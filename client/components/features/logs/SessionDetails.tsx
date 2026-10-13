"use client";
import Link from "next/link";
import { btn } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import { vehicleLabel } from "@/lib/drivers";
import { END_REASON_TEXT, deviceTitle, durationOf, fmtDateTime, fmtDuration, fmtKm, osLabel, sessionState } from "@/lib/logs";
import type { Session } from "@/types/session";
import StateBadge from "./StateBadge";

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

export default function SessionDetails({ s, now, onClose }: { s: Session; now: number; onClose: () => void }) {
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
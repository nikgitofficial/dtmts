"use client";
import { useState } from "react";
import { hasRoutePins, vehicleLabel, type Driver } from "@/lib/drivers";
import Modal from "./Modal";
import { btn, ICON, Icon, StatusBadge } from "./ui";

export default function DriverDetails({
  driver: d, onClose, onEdit, onDelete,
}: {
  driver: Driver;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPin() {
    try {
      await navigator.clipboard.writeText(String(d.pinCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked: ignore */ }
  }

  const items: [string, React.ReactNode][] = [
    ["Email", <a key="e" href={`mailto:${d.email}`} className="break-all text-brand hover:underline">{d.email}</a>],
    ["Phone", <a key="p" href={`tel:${d.phone}`} className="text-brand hover:underline">{d.phone}</a>],
    ["Route", `${d.routeFrom} → ${d.routeTo}`],
    ["Map pins", hasRoutePins(d) ? "Start and destination pinned" : "Place not found, check the spelling"],
    ["Plate number", d.plateNumber],
    ["Truck", vehicleLabel(d) || "—"],
    ["Capacity", `${d.capacityKg.toLocaleString()} kg`],
  ];

  return (
    <Modal title={d.name} description={d.plateNumber} onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={d.status} />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          Driver PIN
          <code className="rounded-md bg-slate-100 px-2.5 py-1 font-mono tracking-widest text-slate-900">{d.pinCode}</code>
          <button
            type="button"
            onClick={copyPin}
            aria-label={copied ? "PIN copied" : "Copy PIN"}
            className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Icon d={copied ? ICON.check : ICON.copy} className={`size-4 ${copied ? "text-green-600" : ""}`} />
          </button>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button type="button" onClick={onDelete} className={btn.dangerOutline}>
          <Icon d={ICON.trash} />
          Delete
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={btn.secondary}>Close</button>
          <button type="button" data-autofocus onClick={onEdit} className={btn.primary}>
            <Icon d={ICON.pencil} />
            Edit driver
          </button>
        </div>
      </div>
    </Modal>
  );
}
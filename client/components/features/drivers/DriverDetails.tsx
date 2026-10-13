"use client";
import { btn, ICON, Icon, StatusBadge } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import { hasRoutePins, vehicleLabel } from "@/lib/drivers";
import { place, titleCase } from "@/schemas/driver";
import type { Driver } from "@/types/driver";
import PinCell from "./PinCell";

export default function DriverDetails({
  driver: d, onClose, onEdit, onDelete,
}: {
  driver: Driver;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const items: [string, React.ReactNode][] = [
    ["Email", <a key="e" href={`mailto:${d.email}`} className="break-all text-brand hover:underline">{d.email}</a>],
    ["Phone", <a key="p" href={`tel:${d.phone}`} className="text-brand hover:underline">{d.phone}</a>],
    ["Route", `${place(d.routeFrom)} → ${place(d.routeTo)}`],
    ["Map pins", hasRoutePins(d) ? "Start and destination pinned" : "Place not found, check the spelling"],
    ["Plate number", d.plateNumber],
    ["Truck", vehicleLabel(d) || "—"],
    ["Capacity", `${d.capacityKg.toLocaleString()} kg`],
  ];

  return (
    <Modal title={titleCase(d.name)} description={d.plateNumber} onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={d.status} />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          Driver PIN
          <PinCell pin={d.pinCode} copyable />
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
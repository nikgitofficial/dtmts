"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rest } from "@/lib/api";
import { BRANDS, type Driver } from "@/lib/drivers";
import Modal from "./Modal";
import { btn, ErrorNote, Spinner } from "./ui";

type Status = "active" | "inactive";
type Form = {
  name: string; email: string; phone: string; routeFrom: string; routeTo: string;
  plateNumber: string; vehicleBrand: string; vehicleType: string; capacityKg: string; status: Status;
};
type Key = keyof Form;
type Canon = Omit<Form, "vehicleBrand" | "vehicleType" | "capacityKg"> &
  { vehicleBrand: string | null; vehicleType: string | null; capacityKg: number };

const LABELS: Record<Key, string> = {
  name: "Name", email: "Email", phone: "Phone", routeFrom: "Origin", routeTo: "Destination",
  plateNumber: "Plate number", vehicleBrand: "Truck brand", vehicleType: "Vehicle type",
  capacityKg: "Capacity", status: "Status",
};
const KEYS = Object.keys(LABELS) as Key[];

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

const PHONE_RE = /^(\+?63|0)9\d{9}$/;
const PLATE_RE = /^[A-Z0-9 -]{5,10}$/;
const cleanPhone = (s: string) => s.replace(/[\s-]/g, "");
const normPhone = (s: string) => { const d = cleanPhone(s); return PHONE_RE.test(d) ? "+63" + d.replace(/^(\+?63|0)/, "") : d; };
const normPlate = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");

function toForm(d?: Driver | null): Form {
  return {
    name: d?.name ?? "", email: d?.email ?? "", phone: d?.phone ?? "",
    routeFrom: d?.routeFrom ?? "", routeTo: d?.routeTo ?? "",
    plateNumber: d?.plateNumber ?? "", vehicleBrand: d?.vehicleBrand ?? "", vehicleType: d?.vehicleType ?? "",
    capacityKg: d ? String(d.capacityKg) : "", status: (d?.status as Status) ?? "active",
  };
}

// Same normalisation the server applies, so "no change" really means no change
function canon(f: Form): Canon {
  return {
    name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: normPhone(f.phone.trim()),
    routeFrom: f.routeFrom.trim(), routeTo: f.routeTo.trim(), plateNumber: normPlate(f.plateNumber),
    vehicleBrand: f.vehicleBrand.trim() || null,
    vehicleType: f.vehicleType.trim() || null, capacityKg: Number(f.capacityKg), status: f.status,
  };
}

const show = (k: Key, v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : k === "capacityKg" ? `${Number(v).toLocaleString()} kg` : String(v);

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1.5 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

export default function DriverModal({
  driver, onClose, onSaved,
}: {
  driver?: Driver | null;
  onClose: () => void;
  onSaved: (d: Driver, mode: "created" | "updated") => void;
}) {
  const router = useRouter();
  const isEdit = !!driver;
  const [form, setForm] = useState<Form>(() => toForm(driver));
  const [step, setStep] = useState<"form" | "review">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const before = canon(toForm(driver));
  const after = canon(form);
  const changes = isEdit ? KEYS.filter((k) => before[k] !== after[k]) : KEYS;
  const loginChanged = isEdit && (changes.includes("email") || changes.includes("phone"));

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!PHONE_RE.test(cleanPhone(form.phone))) return setError("Enter a valid PH mobile number, e.g. 0917 123 4567.");
    if (!PLATE_RE.test(normPlate(form.plateNumber))) return setError("Plate number must be 5–10 letters, numbers, spaces or dashes.");
    setError("");
    setStep("review");
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      if (isEdit) {
        const body = Object.fromEntries(changes.map((k) => [k, after[k]]));
        const r = await rest<{ driver: Driver }>(`/drivers/${driver!.id}`, "PATCH", body);
        onSaved(r.driver, "updated");
      } else {
        const r = await rest<{ driver: Driver }>("/drivers", "POST", after);
        onSaved(r.driver, "created");
      }
    } catch (e) {
      const m = (e as Error).message;
      if (m === "Unauthorized") { router.replace("/login"); return; }
      setError(m);
      setBusy(false);
    }
  }

  const reviewing = step === "review";
  const title = reviewing ? (isEdit ? "Confirm changes" : "Confirm registration") : isEdit ? `Edit ${driver!.name}` : "Register driver";
  const description = reviewing ? "Nothing is saved until you confirm." : isEdit ? "Update the details below." : "Enter the driver and vehicle details.";

  return (
    <Modal title={title} description={description} size="lg" busy={busy} onClose={onClose}>
      {!reviewing ? (
        <form onSubmit={review} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <input data-autofocus value={form.name} onChange={set("name")} required maxLength={80} autoComplete="off" placeholder="Juan Dela Cruz" className={input} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={set("email")} required maxLength={254} autoComplete="off" placeholder="driver@company.com" className={input} />
            </Field>
            <Field label="Phone">
              <input type="tel" value={form.phone} onChange={set("phone")} required autoComplete="off" placeholder="0917 123 4567" className={input} />
            </Field>
            <Field label="Origin (start)">
              <input value={form.routeFrom} onChange={set("routeFrom")} required maxLength={80} placeholder="Davao City" className={input} />
            </Field>
            <Field label="Destination (end)">
              <input value={form.routeTo} onChange={set("routeTo")} required maxLength={80} placeholder="Cagayan de Oro" className={input} />
            </Field>
            <p className="text-xs text-slate-500 sm:col-span-2">Origin and destination are pinned on the live map, so use a town or city name.</p>
            <Field label="Plate number">
              <input value={form.plateNumber} onChange={set("plateNumber")} required maxLength={10} placeholder="ABC 1234" className={`${input} uppercase`} />
            </Field>
            <Field label="Truck brand (optional)">
              <input list="truck-brands" value={form.vehicleBrand} onChange={set("vehicleBrand")} maxLength={40} placeholder="Honda, Suzuki…" className={input} />
              <datalist id="truck-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="Vehicle type (optional)">
              <input value={form.vehicleType} onChange={set("vehicleType")} maxLength={40} placeholder="10-wheeler" className={input} />
            </Field>
            <Field label="Capacity (kg)">
              <input type="number" inputMode="decimal" min={1} max={100000} step="any" value={form.capacityKg} onChange={set("capacityKg")} required placeholder="8000" className={input} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set("status")} className={input}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            {isEdit && changes.length === 0 && <span className="mr-auto text-sm text-slate-500">No changes yet</span>}
            <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
            <button type="submit" disabled={isEdit && changes.length === 0} className={btn.primary}>
              {isEdit ? "Review changes" : "Review & register"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {isEdit
              ? `You're about to change ${changes.length} field${changes.length === 1 ? "" : "s"} on ${driver!.name}.`
              : "Check the details below. A 6-digit PIN is generated automatically when you confirm."}
          </p>

          <dl className="divide-y divide-slate-200 rounded-xl bg-slate-50 px-4 ring-1 ring-slate-200">
            {changes.map((k) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                <dt className="shrink-0 text-slate-500">{LABELS[k]}</dt>
                <dd className="min-w-0 break-words text-right font-medium text-slate-900">
                  {isEdit && <span className="mr-2 font-normal text-slate-400 line-through">{show(k, before[k])}</span>}
                  {show(k, after[k])}
                </dd>
              </div>
            ))}
          </dl>

          {loginChanged && (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
              This driver signs in with their email or phone, so they'll need to use the new one.
            </p>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => { setError(""); setStep("form"); }} disabled={busy} className={btn.secondary}>Back</button>
            <button type="button" onClick={confirm} disabled={busy} className={btn.primary}>
              {busy && <Spinner />}
              {isEdit ? "Save changes" : "Register driver"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
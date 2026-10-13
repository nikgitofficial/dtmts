"use client";
import { BRANDS } from "@/lib/drivers";
import type { FieldErrors } from "@/lib/validation";
import { MAX_CAPACITY_KG, MIN_CAPACITY_KG, type DriverFormValues, type DriverKey } from "@/schemas/driver";

type Change = (k: DriverKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
type Blur = (k: DriverKey) => () => void;

const base = "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-4";
const ok = "border-slate-300 focus:border-brand focus:ring-brand/15";
const bad = "border-red-400 focus:border-red-500 focus:ring-red-500/15";

function Field({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1.5 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {children}
      {error && <span role="alert" className="block text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

/** The driver form fields, shared by the modal and the full-page form. */
export default function DriverFields({
  form, errors, onChange, onBlur, autoFocus = false, disabled = false,
}: { form: DriverFormValues; errors: FieldErrors; onChange: Change; onBlur?: Blur; autoFocus?: boolean; disabled?: boolean }) {
  const p = (k: DriverKey, extra = "") => ({
    value: form[k],
    onChange: onChange(k),
    onBlur: onBlur?.(k),
    disabled,
    "aria-invalid": errors[k] ? true : undefined,
    className: `${base} ${errors[k] ? bad : ok} ${extra}`,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" error={errors.name} className="sm:col-span-2">
        <input data-autofocus={autoFocus || undefined} {...p("name")} maxLength={80} autoComplete="off" placeholder="Juan Dela Cruz" />
      </Field>
      <Field label="Email" error={errors.email}>
        <input type="email" {...p("email")} maxLength={254} autoComplete="off" placeholder="driver@company.com" />
      </Field>
      <Field label="Phone" error={errors.phone}>
        <input type="tel" {...p("phone")} autoComplete="off" placeholder="0917 123 4567" />
      </Field>
      <Field label="Origin (start)" error={errors.routeFrom}>
        <input {...p("routeFrom")} maxLength={80} placeholder="Davao City" />
      </Field>
      <Field label="Destination (end)" error={errors.routeTo}>
        <input {...p("routeTo")} maxLength={80} placeholder="Cagayan de Oro" />
      </Field>
      <p className="text-xs text-slate-500 sm:col-span-2">Origin and destination are pinned on the live map, so use a town or city name.</p>
      <Field label="Plate number" error={errors.plateNumber}>
        <input {...p("plateNumber", "uppercase")} maxLength={10} placeholder="ABC 1234" />
      </Field>
      <Field label="Truck brand (optional)" error={errors.vehicleBrand}>
        <input list="truck-brands" {...p("vehicleBrand")} maxLength={40} placeholder="Honda, Suzuki…" />
        <datalist id="truck-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
      </Field>
      <Field label="Vehicle type (optional)" error={errors.vehicleType}>
        <input {...p("vehicleType")} maxLength={40} placeholder="10-wheeler" />
      </Field>
      <Field label="Capacity (kg)" error={errors.capacityKg}>
        <input type="number" inputMode="decimal" min={MIN_CAPACITY_KG} max={MAX_CAPACITY_KG} step="any" {...p("capacityKg")} placeholder="8000" />
        {!errors.capacityKg && (
          <span className="block text-xs font-normal text-slate-500">Max load the truck can carry, at least {MIN_CAPACITY_KG} kg.</span>
        )}
      </Field>
      <Field label="Status">
        <select {...p("status")}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>
    </div>
  );
}
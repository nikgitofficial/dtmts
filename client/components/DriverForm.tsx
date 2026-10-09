"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { rest } from "@/lib/api";
import { BRANDS, type Driver } from "@/lib/drivers";

const input = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";

export default function DriverForm({ driver }: { driver?: Driver }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState(driver?.pinCode);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const body = {
      name: f.name, email: f.email, phone: f.phone,
      routeFrom: f.routeFrom, routeTo: f.routeTo, plateNumber: f.plateNumber,
      vehicleBrand: f.vehicleBrand || null,
      vehicleType: f.vehicleType || null, capacityKg: Number(f.capacityKg), status: f.status,
    };
    try {
      if (driver) await rest(`/drivers/${driver.id}`, "PATCH", body);
      else await rest("/drivers", "POST", body);
      router.replace("/dashboard/drivers");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function regenerate() {
    if (!driver || !confirm("Generate a new PIN? The old one stops working.")) return;
    try {
      const { driver: d } = await rest<{ driver: Driver }>(`/drivers/${driver.id}/regenerate-pin`, "POST");
      setPin(d.pinCode);
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{driver ? "Edit driver" : "Register driver"}</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-5 rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium">Full name
          <input name="name" required maxLength={80} defaultValue={driver?.name} className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Email
          <input name="email" type="email" required defaultValue={driver?.email} className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Phone number
          <input name="phone" type="tel" required placeholder="0917 123 4567" defaultValue={driver?.phone} className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Plate number
          <input name="plateNumber" required placeholder="ABC 1234" maxLength={10} defaultValue={driver?.plateNumber} className={`${input} uppercase`} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Route from
          <input name="routeFrom" required placeholder="Davao" maxLength={80} defaultValue={driver?.routeFrom} className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Route to
          <input name="routeTo" required placeholder="Cagayan de Oro" maxLength={80} defaultValue={driver?.routeTo} className={input} />
        </label>
                <label className="block space-y-1.5 text-sm font-medium">Truck brand (optional)
          <input name="vehicleBrand" list="truck-brands" placeholder="Honda, Suzuki…" maxLength={40} defaultValue={driver?.vehicleBrand ?? ""} className={input} />
          <datalist id="truck-brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Vehicle type (optional)
          <input name="vehicleType" placeholder="Closed van, L300…" maxLength={40} defaultValue={driver?.vehicleType ?? ""} className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Capacity (kg)
          <input name="capacityKg" type="number" required min={1} step="0.01" max={100000} defaultValue={driver?.capacityKg} className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Status
          <select name="status" defaultValue={driver?.status ?? "active"} className={input}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        {driver && (
          <div className="space-y-1.5 text-sm font-medium">PIN code
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-3.5 py-2.5 font-mono text-base tracking-widest">{pin}</code>
              <button type="button" onClick={regenerate} className="rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 hover:bg-slate-50">Regenerate</button>
            </div>
          </div>
        )}
        {!driver && <p className="self-end text-sm text-slate-500">A unique 6-digit PIN is generated automatically.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
        <div className="flex gap-3 sm:col-span-2">
          <button disabled={busy} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
            {busy ? "Saving…" : driver ? "Save changes" : "Register driver"}
          </button>
          <Link href="/dashboard/drivers" className="rounded-lg px-5 py-2.5 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
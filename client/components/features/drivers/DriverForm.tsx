"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btn, ErrorNote, Spinner } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useApiError } from "@/hooks/useApiError";
import { useDriverForm } from "@/hooks/useDriverForm";
import { restParsed } from "@/lib/api";
import { canon, driverResponseSchema } from "@/schemas/driver";
import type { Driver } from "@/types/driver";
import DriverFields from "./DriverFields";
import PinCell from "./PinCell";

/** Full-page create/edit form (the drivers list uses DriverModal instead). */
export default function DriverForm({ driver }: { driver?: Driver }) {
  const router = useRouter();
  const toast = useToast();
  const handleError = useApiError();
  const { form, errors, set, blur, validateForm } = useDriverForm(driver);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState(driver?.pinCode);
  const [askPin, setAskPin] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateForm()) return;
    setError("");
    setBusy(true);
    const body = canon(form);
    try {
      if (driver) {
        await restParsed(`/drivers/${driver.id}`, driverResponseSchema, "PATCH", body);
        toast.updated(`${body.name} updated`);
      } else {
        await restParsed("/drivers", driverResponseSchema, "POST", body);
        toast.created(`${body.name} registered`);
      }
      router.replace("/dashboard/drivers");
      router.refresh();
    } catch (err) {
      const m = handleError(err);
      if (m) { setError(m); toast.error(m); }
      setBusy(false);
    }
  }

  async function regenerate() {
    if (!driver) return;
    setPinBusy(true);
    setPinError("");
    try {
      const r = await restParsed(`/drivers/${driver.id}/regenerate-pin`, driverResponseSchema, "POST");
      setPin(r.driver.pinCode);
      setAskPin(false);
      toast.updated("New PIN generated");
    } catch (err) {
      const m = handleError(err);
      if (m) setPinError(m);
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{driver ? "Edit driver" : "Register driver"}</h1>
      <form onSubmit={onSubmit} noValidate aria-busy={busy} className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
        <DriverFields form={form} errors={errors} onChange={set} onBlur={blur} disabled={busy} autoFocus />

        {driver ? (
          <div className="space-y-1.5 text-sm font-medium">
            PIN code
            <div className="flex items-center gap-2">
              <PinCell pin={pin ?? ""} copyable codeClassName="rounded-lg bg-slate-100 px-3.5 py-2.5 font-mono text-base tracking-widest" />
              <button type="button" onClick={() => { setPinError(""); setAskPin(true); }} className={btn.smSecondary}>Regenerate</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">A unique 6-digit PIN is generated automatically.</p>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex gap-3">
          <button disabled={busy} className={btn.primary}>
            {busy && <Spinner />}
            {busy ? "Saving…" : driver ? "Save changes" : "Register driver"}
          </button>
          <Link href="/dashboard/drivers" className={btn.secondary}>Cancel</Link>
        </div>
      </form>

      {askPin && (
        <ConfirmModal
          title="Generate a new PIN?"
          message="The old PIN stops working immediately. Share the new one with the driver."
          confirmLabel="Generate PIN"
          tone="brand"
          busy={pinBusy}
          error={pinError}
          onConfirm={regenerate}
          onCancel={() => setAskPin(false)}
        />
      )}
    </div>
  );
}
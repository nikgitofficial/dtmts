"use client";
import { useState } from "react";
import { btn, ErrorNote, Spinner } from "@/components/ui";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApiError } from "@/hooks/useApiError";
import { useDriverForm } from "@/hooks/useDriverForm";
import { restParsed } from "@/lib/api";
import {
  DRIVER_KEYS, DRIVER_LABELS, canon, driverResponseSchema, toForm, type DriverKey,
} from "@/schemas/driver";
import type { Driver } from "@/types/driver";
import DriverFields from "./DriverFields";

const show = (k: DriverKey, v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : k === "capacityKg" ? `${Number(v).toLocaleString()} kg` : String(v);

export default function DriverModal({
  driver, onClose, onSaved,
}: {
  driver?: Driver | null;
  onClose: () => void;
  onSaved: (d: Driver, mode: "created" | "updated") => void;
}) {
  const handleError = useApiError();
  const isEdit = !!driver;
  const { form, errors, set, validateForm } = useDriverForm(driver);
  const [step, setStep] = useState<"form" | "review">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const before = canon(toForm(driver));
  const after = canon(form);
  const changes = isEdit ? DRIVER_KEYS.filter((k) => before[k] !== after[k]) : DRIVER_KEYS;
  const loginChanged = isEdit && (changes.includes("email") || changes.includes("phone"));

  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setError("");
    setStep("review");
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      if (isEdit) {
        const body = Object.fromEntries(changes.map((k) => [k, after[k]]));
        const r = await restParsed(`/drivers/${driver!.id}`, driverResponseSchema, "PATCH", body);
        onSaved(r.driver, "updated");
      } else {
        const r = await restParsed("/drivers", driverResponseSchema, "POST", after);
        onSaved(r.driver, "created");
      }
    } catch (e) {
      const m = handleError(e);
      if (m) setError(m);
      setBusy(false);
    }
  }

  const reviewing = step === "review";
  const title = reviewing ? (isEdit ? "Confirm changes" : "Confirm registration") : isEdit ? `Edit ${driver!.name}` : "Register driver";
  const description = reviewing ? "Nothing is saved until you confirm." : isEdit ? "Update the details below." : "Enter the driver and vehicle details.";

  return (
    <Modal title={title} description={description} size="lg" busy={busy} onClose={onClose}>
      {!reviewing ? (
        <form onSubmit={review} noValidate className="space-y-5">
          <DriverFields form={form} errors={errors} onChange={set} autoFocus />
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

          <dl className="divide-y divide-slate-200 rounded-xl bg-slate-50 px-4 ring-1 ring-slate-200" aria-busy={busy}>
            {changes.map((k) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <dt className="shrink-0 text-slate-500">{DRIVER_LABELS[k]}</dt>
                <dd className="min-w-0 break-words text-right font-medium text-slate-900">
                  {busy ? (
                    <Skeleton className="ml-auto h-4 w-32" />
                  ) : (
                    <>
                      {isEdit && <span className="mr-2 font-normal text-slate-400 line-through">{show(k, before[k])}</span>}
                      {show(k, after[k])}
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          {loginChanged && (
            <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
              This driver signs in with their email or phone, so they&apos;ll need to use the new one.
            </p>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => { setError(""); setStep("form"); }} disabled={busy} className={btn.secondary}>Back</button>
            <button type="button" onClick={confirm} disabled={busy} className={btn.primary}>
              {busy && <Spinner />}
              {busy ? "Saving…" : isEdit ? "Save changes" : "Register driver"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
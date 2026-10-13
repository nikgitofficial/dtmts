"use client";
import { useState } from "react";
import { btn, ICON, Icon, StatusBadge } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import SearchInput from "@/components/ui/SearchInput";
import { Skeleton, TableRowsSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useApiError } from "@/hooks/useApiError";
import { useDrivers } from "@/hooks/useDrivers";
import { rest } from "@/lib/api";
import { PAGE_SIZE } from "@/lib/constants";
import { vehicleLabel } from "@/lib/drivers";
import { place, titleCase } from "@/schemas/driver";
import type { Driver } from "@/types/driver";
import DriverDetails from "./DriverDetails";
import DriverModal from "./DriverModal";
import PinCell from "./PinCell";
import { DRIVER_ROW_WIDTHS } from "./skeletons";

type ModalState =
  | { kind: "add" }
  | { kind: "view"; driver: Driver }
  | { kind: "edit"; driver: Driver }
  | { kind: "delete"; driver: Driver }
  | null;

/** Text columns are left-aligned; numeric columns are right-aligned for easy scanning. */
const COLUMNS: { label: string; right?: boolean }[] = [
  { label: "Driver" }, { label: "Route" }, { label: "Plate" },
  { label: "Capacity", right: true }, { label: "PIN" }, { label: "Status" },
];

export default function DriversView() {
  const toast = useToast();
  const handleError = useApiError();
  const { list, total, loading, error, q, page, setSearch, setPage, reload } = useDrivers();
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const close = () => setModal(null);

  function saved(d: Driver, mode: "created" | "updated") {
    setModal(null);
    if (mode === "created") toast.created(`${titleCase(d.name)} registered`);
    else toast.updated(`${titleCase(d.name)} updated`);
    if (mode === "created" && page !== 1) setPage(1); // newest first, so jump to page 1
    else reload(); // table shows skeleton rows while it refetches
  }

  function askDelete(d: Driver) {
    setDeleteError("");
    setModal({ kind: "delete", driver: d });
  }

  async function confirmDelete(d: Driver) {
    setDeleting(true);
    setDeleteError("");
    try {
      await rest(`/drivers/${d.id}`, "DELETE");
      setModal(null);
      toast.deleted(`${titleCase(d.name)} deleted`);
      reload();
    } catch (e) {
      const m = handleError(e);
      if (m) setDeleteError(m);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
          <div className="mt-1 text-sm text-slate-500">
            {list === null ? <Skeleton className="mt-2 h-4 w-32" /> : `${total} registered${q ? " matching your search" : ""}`}
          </div>
        </div>
        <button onClick={() => setModal({ kind: "add" })} className={btn.primary}>
          <Icon d={ICON.plus} />
          Register driver
        </button>
      </div>

      <SearchInput className="mt-6" value={q} onChange={setSearch} placeholder="Search name, plate, brand, route…" label="Search drivers" />

      {error && (
        <p role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button onClick={reload} className="font-medium underline">Retry</button>
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm" aria-busy={loading}>
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.label} className={`px-4 py-3 font-medium ${c.right ? "text-right" : ""}`}>{c.label}</th>
              ))}
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <TableRowsSkeleton rows={6} widths={DRIVER_ROW_WIDTHS} />}

            {!loading && list?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-medium text-slate-900">{q ? `No drivers match “${q}”` : "No drivers yet"}</p>
                  <p className="mt-1 text-slate-500">{q ? "Try a different name, plate or route." : "Register your first driver to start tracking."}</p>
                  <div className="mt-4">
                    {q
                      ? <button onClick={() => setSearch("")} className={btn.secondary}>Clear search</button>
                      : <button onClick={() => setModal({ kind: "add" })} className={btn.primary}><Icon d={ICON.plus} />Register driver</button>}
                  </div>
                </td>
              </tr>
            )}

            {!loading && list?.map((d) => (
              <tr key={d.id} onClick={() => setModal({ kind: "view", driver: d })} className="cursor-pointer transition hover:bg-slate-50">
                <td className="px-4 py-3">
                  {/* The row handles the click; this button gives keyboard users a way in (Enter bubbles to the row). */}
                  <button type="button" className="block max-w-[16rem] truncate text-left font-medium text-slate-900 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{titleCase(d.name)}</button>
                  <div className="text-slate-500">{d.email} · {d.phone}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{place(d.routeFrom)} → {place(d.routeTo)}</td>
                <td className="whitespace-nowrap px-4 py-3">{d.plateNumber}{vehicleLabel(d) && <div className="text-slate-500">{vehicleLabel(d)}</div>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{d.capacityKg.toLocaleString()} kg</td>
                <td className="px-4 py-3"><PinCell pin={d.pinCode} codeClassName="rounded bg-slate-100 px-2 py-1 font-mono tracking-widest" /></td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setModal({ kind: "edit", driver: d })} className={btn.smSecondary} aria-label={`Edit ${titleCase(d.name)}`}>
                      <Icon d={ICON.pencil} />Edit
                    </button>
                    <button onClick={() => askDelete(d)} className={btn.smDanger} aria-label={`Delete ${titleCase(d.name)}`}>
                      <Icon d={ICON.trash} />Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} disabled={loading} />

      {modal?.kind === "view" && (
        <DriverDetails
          driver={modal.driver}
          onClose={close}
          onEdit={() => setModal({ kind: "edit", driver: modal.driver })}
          onDelete={() => askDelete(modal.driver)}
        />
      )}
      {modal?.kind === "add" && <DriverModal onClose={close} onSaved={saved} />}
      {modal?.kind === "edit" && <DriverModal key={modal.driver.id} driver={modal.driver} onClose={close} onSaved={saved} />}
      {modal?.kind === "delete" && (
        <ConfirmModal
          title="Delete driver?"
          message={<><strong className="font-semibold text-slate-900">{titleCase(modal.driver.name)}</strong> ({modal.driver.plateNumber}) will be permanently removed. This cannot be undone.</>}
          confirmLabel="Delete driver"
          busy={deleting}
          error={deleteError}
          onConfirm={() => confirmDelete(modal.driver)}
          onCancel={close}
        />
      )}
    </div>
  );
}
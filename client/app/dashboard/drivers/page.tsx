"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DriverDetails from "@/components/DriverDetails";
import DriverModal from "@/components/DriverModal";
import { ConfirmModal } from "@/components/Modal";
import { btn, ICON, Icon, StatusBadge } from "@/components/ui";
import { rest } from "@/lib/api";
import { vehicleLabel, type Driver } from "@/lib/drivers";


const PAGE_SIZE = 20;

type ModalState =
  | { kind: "add" }
  | { kind: "view"; driver: Driver }
  | { kind: "edit"; driver: Driver }
  | { kind: "delete"; driver: Driver }
  | null;

export default function DriversPage() {
  const router = useRouter();
  const [list, setList] = useState<Driver[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const reqId = useRef(0);          // ignore responses that arrive out of order
  const lastQ = useRef(q);

  const load = useCallback(async (query: string, pg: number) => {
    const id = ++reqId.current;
    try {
      const d = await rest<{ drivers: Driver[]; total: number }>(
        `/drivers?q=${encodeURIComponent(query)}&page=${pg}&limit=${PAGE_SIZE}`,
      );
      if (id !== reqId.current) return;
      // Deleted the last row of the last page: step back
      if (d.drivers.length === 0 && pg > 1) { setPage(pg - 1); return; }
      setList(d.drivers);
      setTotal(d.total);
      setError("");
    } catch (e) {
      if (id !== reqId.current) return;
      if ((e as Error).message === "Unauthorized") router.replace("/login");
      else setError((e as Error).message);
    }
  }, [router]);

  useEffect(() => {
    const searching = lastQ.current !== q;
    lastQ.current = q;
    const t = setTimeout(() => load(q, page), searching ? 300 : 0); // debounce typing only
    return () => clearTimeout(t);
  }, [q, page, load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const close = () => setModal(null);

  function saved(d: Driver, mode: "created" | "updated") {
    setModal(null);
    setNotice(mode === "created" ? `${d.name} registered` : `${d.name} updated`);
    if (mode === "created" && page !== 1) setPage(1); // newest first, so jump to page 1
    else load(q, page);
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
      setNotice(`${d.name} deleted`);
      load(q, page);
    } catch (e) {
      const m = (e as Error).message;
      if (m === "Unauthorized") { router.replace("/login"); return; }
      setDeleteError(m);
    } finally {
      setDeleting(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {list === null ? "Loading…" : `${total} registered${q ? " matching your search" : ""}`}
          </p>
        </div>
        <button onClick={() => setModal({ kind: "add" })} className={btn.primary}>
          <Icon d={ICON.plus} />
          Register driver
        </button>
      </div>

      <div className="relative mt-6 max-w-sm">
        <Icon d={ICON.search} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search name, plate, brand, route…"
          aria-label="Search drivers"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        {q && (
          <button
            onClick={() => { setQ(""); setPage(1); }}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Icon d={ICON.x} />
          </button>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>{["Driver", "Route", "Plate", "Capacity", "PIN", "Status"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}<th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list === null && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-9 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" /></td></tr>
            ))}

            {list?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-medium text-slate-900">{q ? `No drivers match “${q}”` : "No drivers yet"}</p>
                  <p className="mt-1 text-slate-500">{q ? "Try a different name, plate or route." : "Register your first driver to start tracking."}</p>
                  <div className="mt-4">
                    {q
                      ? <button onClick={() => { setQ(""); setPage(1); }} className={btn.secondary}>Clear search</button>
                      : <button onClick={() => setModal({ kind: "add" })} className={btn.primary}><Icon d={ICON.plus} />Register driver</button>}
                  </div>
                </td>
              </tr>
            )}

            {list?.map((d) => (
              <tr key={d.id} onClick={() => setModal({ kind: "view", driver: d })} className="cursor-pointer transition hover:bg-slate-50">
                <td className="px-4 py-3">
                  {/* The row handles the click; this button gives keyboard users a way in (Enter bubbles to the row). */}
                  <button type="button" className="block max-w-[16rem] truncate text-left font-medium text-slate-900 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{d.name}</button>
                  <div className="text-slate-500">{d.email} · {d.phone}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{d.routeFrom} → {d.routeTo}</td>
                <td className="whitespace-nowrap px-4 py-3">{d.plateNumber}{vehicleLabel(d) && <div className="text-slate-500">{vehicleLabel(d)}</div>}</td>
                <td className="whitespace-nowrap px-4 py-3">{d.capacityKg.toLocaleString()} kg</td>
                <td className="px-4 py-3"><code className="rounded bg-slate-100 px-2 py-1 font-mono tracking-widest">{d.pinCode}</code></td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setModal({ kind: "edit", driver: d })} className={btn.smSecondary} aria-label={`Edit ${d.name}`}>
                      <Icon d={ICON.pencil} />Edit
                    </button>
                    <button onClick={() => askDelete(d)} className={btn.smDanger} aria-label={`Delete ${d.name}`}>
                      <Icon d={ICON.trash} />Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>Showing {from}–{to} of {total}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btn.smSecondary}>
              <Icon d={ICON.left} />Previous
            </button>
            <span className="tabular-nums">Page {page} of {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={btn.smSecondary}>
              Next<Icon d={ICON.right} />
            </button>
          </div>
        </nav>
      )}

      {/* ── Modals ── */}
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
          message={<><strong className="font-semibold text-slate-900">{modal.driver.name}</strong> ({modal.driver.plateNumber}) will be permanently removed. This cannot be undone.</>}
          confirmLabel="Delete driver"
          busy={deleting}
          error={deleteError}
          onConfirm={() => confirmDelete(modal.driver)}
          onCancel={close}
        />
      )}

      {notice && (
        <div role="status" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Icon d={ICON.check} className="size-4 text-green-400" />
          {notice}
        </div>
      )}
    </main>
  );
}
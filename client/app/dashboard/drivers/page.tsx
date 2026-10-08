"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { rest } from "@/lib/api";
import type { Driver } from "@/lib/drivers";

const PAGE_SIZE = 20;

export default function DriversPage() {
  const router = useRouter();
  const [list, setList] = useState<Driver[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
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

  async function remove(d: Driver) {
    if (!confirm(`Delete ${d.name}? This cannot be undone.`)) return;
    try { await rest(`/drivers/${d.id}`, "DELETE"); load(q, page); }
    catch (e) { setError((e as Error).message); }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
        </div>
        <Link href="/dashboard/drivers/new" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">Register driver</Link>
      </div>

      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, plate, route…" aria-label="Search drivers"
        className="mt-6 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>{["Driver", "Route", "Plate", "Capacity", "PIN", "Status", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list === null && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {list?.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No drivers found.</td></tr>}
            {list?.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3"><div className="font-medium">{d.name}</div><div className="text-slate-500">{d.email} · {d.phone}</div></td>
                <td className="px-4 py-3 whitespace-nowrap">{d.routeFrom} → {d.routeTo}</td>
                <td className="px-4 py-3 whitespace-nowrap">{d.plateNumber}{d.vehicleType && <div className="text-slate-500">{d.vehicleType}</div>}</td>
                <td className="px-4 py-3 whitespace-nowrap">{d.capacityKg.toLocaleString()} kg</td>
                <td className="px-4 py-3"><code className="rounded bg-slate-100 px-2 py-1 font-mono tracking-widest">{d.pinCode}</code></td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${d.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{d.status}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Link href={`/dashboard/drivers/${d.id}/edit`} className="font-medium text-brand hover:underline">Edit</Link>
                  <button onClick={() => remove(d)} className="ml-4 font-medium text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>Showing {from}–{to} of {total}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-lg px-3 py-1.5 font-medium ring-1 ring-slate-300 hover:bg-white disabled:opacity-40">Previous</button>
            <span>Page {page} of {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
              className="rounded-lg px-3 py-1.5 font-medium ring-1 ring-slate-300 hover:bg-white disabled:opacity-40">Next</button>
          </div>
        </nav>
      )}
    </main>
  );
}
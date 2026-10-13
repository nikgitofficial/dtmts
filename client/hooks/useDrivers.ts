"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApiError } from "@/hooks/useApiError";
import { restParsed } from "@/lib/api";
import { PAGE_SIZE } from "@/lib/constants";
import { driversResponseSchema } from "@/schemas/driver";
import type { Driver } from "@/types/driver";

/** Search + pagination + fetching for the drivers table. `loading` is true for every fetch, so the UI can show skeleton rows. */
export function useDrivers() {
  const handleError = useApiError();
  const [list, setList] = useState<Driver[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reqId = useRef(0); // ignore responses that arrive out of order
  const lastQ = useRef(q);

  const load = useCallback(async (query: string, pg: number) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const d = await restParsed(`/drivers?q=${encodeURIComponent(query)}&page=${pg}&limit=${PAGE_SIZE}`, driversResponseSchema);
      if (id !== reqId.current) return;
      // Deleted the last row of the last page: step back
      if (d.drivers.length === 0 && pg > 1) { setPage(pg - 1); return; }
      setList(d.drivers);
      setTotal(d.total);
      setError("");
      setLoading(false);
    } catch (e) {
      if (id !== reqId.current) return;
      const m = handleError(e);
      if (m) setError(m);
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    const searching = lastQ.current !== q;
    lastQ.current = q;
    const t = setTimeout(() => load(q, page), searching ? 300 : 0); // debounce typing only
    return () => clearTimeout(t);
  }, [q, page, load]);

  const setSearch = useCallback((v: string) => { setQ(v); setPage(1); }, []);
  const reload = useCallback(() => load(q, page), [load, q, page]);

  return { list, total, loading, error, q, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), setSearch, setPage, reload };
}
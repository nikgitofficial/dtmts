"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApiError } from "@/hooks/useApiError";
import { restParsed } from "@/lib/api";
import { PAGE_SIZE } from "@/lib/constants";
import { sessionsResponseSchema } from "@/schemas/session";
import type { SessionsResponse } from "@/types/session";

export type StatusFilter = "all" | "live" | "ended";

/** Filters + pagination + 15s quiet refresh for the session logs. `loading` is only true for user-triggered fetches. */
export function useSessions() {
  const handleError = useApiError();
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatusRaw] = useState<StatusFilter>("all");
  const [days, setDaysRaw] = useState(7);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t); }, []);

  const filterQs = useMemo(() => new URLSearchParams({ q: dq, status, days: String(days) }), [dq, status, days]);

  const load = useCallback(async (silent = false) => {
    const id = ++reqId.current;
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams(filterQs);
      qs.set("page", String(page));
      qs.set("limit", String(PAGE_SIZE));
      const d = await restParsed(`/tracking/sessions?${qs}`, sessionsResponseSchema);
      if (id !== reqId.current) return;
      if (d.sessions.length === 0 && page > 1) { setPage(page - 1); return; }
      setData(d);
      setNow(Date.now());
      setError("");
      setLoading(false);
    } catch (e) {
      if (id !== reqId.current) return;
      const m = handleError(e);
      if (m) setError(m);
      setLoading(false);
    }
  }, [filterQs, page, handleError]);

  // load now, then refresh quietly so live sessions stay current
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(true); }, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const setStatus = (s: StatusFilter) => { setStatusRaw(s); setPage(1); };
  const setDays = (d: number) => { setDaysRaw(d); setPage(1); };
  const reset = () => { setQ(""); setDq(""); setStatusRaw("all"); setPage(1); };

  return {
    data, loading, error, now, q, setQ, status, setStatus, days, setDays, page, setPage, reset,
    filterQs: filterQs.toString(), filtered: dq !== "" || status !== "all", reload: () => load(),
  };
}
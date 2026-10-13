"use client";
import { useEffect, useState } from "react";
import { useApiError } from "@/hooks/useApiError";
import { restParsed } from "@/lib/api";
import { POLL_MS } from "@/lib/tracking";
import { liveResponseSchema } from "@/schemas/tracking";
import type { LiveDriver } from "@/types/tracking";

/** Polls /tracking/live, pausing while the tab is hidden. Shared by the dashboard and the tracking page. */
export function useLiveDrivers() {
  const handleError = useApiError();
  const [data, setData] = useState<{ drivers: LiveDriver[]; fetchedAt: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stop) return;
      if (!document.hidden) {
        try {
          const r = await restParsed("/tracking/live", liveResponseSchema);
          if (!stop) { setData({ drivers: r.drivers, fetchedAt: Date.now() }); setError(""); }
        } catch (e) {
          if (handleError(e) === null) return; // redirected to /login
          if (!stop) setError("Connection lost. Retrying…");
        }
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [handleError]);

  return { data, error };
}
"use client";
import { useEffect, useState } from "react";
import { restParsed } from "@/lib/api";
import { trailResponseSchema } from "@/schemas/tracking";
import type { TrailPoint } from "@/types/tracking";

export function useTrail(selectedId: string | null, hours: number) {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) { setTrail([]); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const r = await restParsed(`/tracking/${selectedId}/history?hours=${hours}`, trailResponseSchema);
        if (!cancelled) setTrail(r.points);
      } catch { /* keep the previous trail */ }
      finally { if (!cancelled) setLoading(false); }
    };
    setTrail([]);
    setLoading(true);
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [selectedId, hours]);

  return { trail, loading };
}
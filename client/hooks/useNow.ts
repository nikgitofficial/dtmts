"use client";
import { useEffect, useState } from "react";

/** Re-renders every `ms` and returns Date.now(); used for "x seconds ago" labels. */
export function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
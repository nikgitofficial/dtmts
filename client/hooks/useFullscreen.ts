"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * The element is stretched over the viewport with CSS (works everywhere, including iPhones),
 * and we also ask the browser for real fullscreen where it's supported.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [full, setFull] = useState(false);

  const exit = useCallback(() => {
    setFull(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const toggle = useCallback(async () => {
    if (full) { exit(); return; }
    setFull(true);
    try { await ref.current?.requestFullscreen(); } catch { /* unsupported: the CSS overlay still works */ }
  }, [full, exit, ref]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit(); };
    const onFs = () => { if (!document.fullscreenElement) setFull(false); }; // Esc in native fullscreen
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      document.body.classList.remove("overflow-hidden");
    };
  }, [full, exit]);

  // Maps need a nudge to re-measure after their container changes size
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event("resize"));
    const t1 = setTimeout(fire, 50);
    const t2 = setTimeout(fire, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [full]);

  return { full, toggle, exit };
}
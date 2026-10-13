"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { STATE_META } from "@/lib/tracking";
import type { TrackRow } from "@/types/tracking";
import TruckIcon from "./TruckIcon";

/** Custom dropdown: pick a driver (with search, status dots and keyboard support). */
export default function DriverSelect({
  rows, selectedId, onChange, loading = false, className = "",
}: {
  rows: TrackRow[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  loading?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const uid = useId();

  const sorted = useMemo(() => [...rows].sort((a, b) => a.d.name.localeCompare(b.d.name)), [rows]);
  const selected = sorted.find((r) => r.d.id === selectedId) ?? null;

  // first entry (null) is "All drivers"; it is hidden while searching
  const options: (TrackRow | null)[] = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return [null, ...sorted];
    return sorted.filter((r) => `${r.d.name} ${r.d.plateNumber}`.toLowerCase().includes(s));
  }, [sorted, query]);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    setQuery("");
    if (refocus) trigger.current?.focus();
  }, []);

  const openMenu = () => {
    const i = options.findIndex((o) => (o ? o.d.id === selectedId : selectedId === null));
    setActive(Math.max(0, i));
    setOpen(true);
  };

  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [open, close]);

  useEffect(() => {
    if (open) list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (r: TrackRow | null) => { onChange(r ? r.d.id : null); close(true); };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (options.length) choose(options[active] ?? null); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === "Tab") close();
  };

  if (loading) return <Skeleton className={`h-[3.0625rem] w-full rounded-xl ${className}`} />;

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); openMenu(); } }}
        disabled={sorted.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm outline-none transition hover:border-slate-400 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-expanded:border-brand aria-expanded:ring-4 aria-expanded:ring-brand/15"
      >
        {selected ? (
          <>
            <span className={`size-2.5 shrink-0 rounded-full ${STATE_META[selected.state].dot}`} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900">{selected.d.name}</span>
              <span className="block truncate text-xs text-slate-500">{selected.d.plateNumber} · {STATE_META[selected.state].label}</span>
            </span>
          </>
        ) : (
          <>
            <TruckIcon className="size-5 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 truncate text-slate-700">{sorted.length === 0 ? "No drivers yet" : "All drivers"}</span>
            {sorted.length > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{sorted.length}</span>}
          </>
        )}
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={`size-4 shrink-0 text-slate-400 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
          <div className="relative border-b border-slate-100 p-2">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden>
              <circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" />
            </svg>
            <input
              ref={input}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onInputKey}
              role="combobox"
              aria-expanded
              aria-controls={`${uid}-list`}
              aria-activedescendant={options.length ? `${uid}-opt-${active}` : undefined}
              aria-label="Search drivers"
              placeholder="Search driver or plate…"
              className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-inset ring-slate-200 transition focus:bg-white focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <ul ref={list} id={`${uid}-list`} role="listbox" aria-label="Drivers" className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
            {options.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No drivers match “{query}”</li>}
            {options.map((r, i) => {
              const isSel = r ? r.d.id === selectedId : selectedId === null;
              return (
                <li
                  key={r ? r.d.id : "all"}
                  id={`${uid}-opt-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(r)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${i === active ? "bg-slate-100" : ""} ${isSel ? "bg-brand/10" : ""}`}
                >
                  {r ? (
                    <>
                      <span className={`size-2.5 shrink-0 rounded-full ${STATE_META[r.state].dot}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate ${isSel ? "font-semibold text-brand" : "font-medium text-slate-900"}`}>{r.d.name}</span>
                        <span className="block truncate text-xs text-slate-500">{r.d.plateNumber} · {r.d.routeFrom} → {r.d.routeTo}</span>
                      </span>
                      <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline ${STATE_META[r.state].badge}`}>{STATE_META[r.state].label}</span>
                    </>
                  ) : (
                    <>
                      <TruckIcon className="size-4 shrink-0 text-slate-400" />
                      <span className={`flex-1 ${isSel ? "font-semibold text-brand" : "font-medium text-slate-900"}`}>All drivers</span>
                      <span className="shrink-0 text-xs text-slate-400">{sorted.length}</span>
                    </>
                  )}
                  {isSel && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-brand" aria-hidden>
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
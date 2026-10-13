"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ICON, Icon } from ".";

export type ToastKind = "created" | "updated" | "deleted" | "error" | "info";
type Item = { id: number; kind: ToastKind; message: string };

/** One colour per action so the result is readable at a glance. */
const STYLES: Record<ToastKind, { box: string; icon: string }> = {
  created: { box: "bg-emerald-600 text-white", icon: ICON.check },
  updated: { box: "bg-blue-600 text-white", icon: ICON.pencil },
  deleted: { box: "bg-red-600 text-white", icon: ICON.trash },
  error:   { box: "bg-orange-600 text-white", icon: ICON.alert },
  info:    { box: "bg-slate-900 text-white", icon: ICON.info },
};

type ToastApi = Record<ToastKind, (message: string) => void>;
const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const t = useContext(ToastContext);
  if (!t) throw new Error("useToast must be used inside <ToastProvider>");
  return t;
}

type PopoverEl = HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);
  const host = useRef<PopoverEl>(null);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { id, kind, message }]); // keep at most 3
    setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    created: (m) => push("created", m),
    updated: (m) => push("updated", m),
    deleted: (m) => push("deleted", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push]);

  // Native <dialog>.showModal() lives in the browser's top layer, which would hide a normal fixed toast.
  // Promoting the container to the top layer (Popover API) keeps toasts visible above open modals.
  useEffect(() => {
    const el = host.current;
    if (!el || items.length === 0 || !el.showPopover) return;
    try {
      el.setAttribute("popover", "manual");
      if (el.matches(":popover-open")) el.hidePopover?.();
      el.showPopover();
    } catch { /* popover unsupported: normal fixed positioning applies */ }
  }, [items]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={host}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 top-auto z-[100] m-0 flex h-auto w-full flex-col items-center gap-2 overflow-visible border-0 bg-transparent px-4 py-0"
      >
        {items.map((t) => {
          const s = STYLES[t.kind];
          return (
            <div key={t.id} className={`pointer-events-auto flex max-w-md animate-toast-in items-center gap-3 rounded-xl py-3 pl-4 pr-2 text-sm font-medium shadow-lg motion-reduce:animate-none ${s.box}`}>
              <Icon d={s.icon} className="size-5" />
              <span className="min-w-0 flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="grid size-7 shrink-0 place-items-center rounded-md opacity-80 transition hover:bg-white/15 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
              >
                <Icon d={ICON.x} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
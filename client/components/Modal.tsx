"use client";
import { useEffect, useId, useRef } from "react";
import { btn, ErrorNote, ICON, Icon, Spinner } from "./ui";

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

type ModalProps = {
  title: string;
  description?: string;
  size?: keyof typeof SIZES;
  /** while true, the modal can't be dismissed (e.g. a request is running) */
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Built on the native <dialog>: focus trapping, Escape and the inert backdrop come free.
 * Render it conditionally ({open && <Modal …/>}). Put `data-autofocus` on the element
 * that should receive focus first.
 */
export default function Modal({ title, description, size = "md", busy = false, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }} // backdrop click
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${SIZES[size]} overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-2xl ring-1 ring-slate-200 backdrop:bg-slate-900/40`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40"
        >
          <Icon d={ICON.x} className="size-5" />
        </button>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </dialog>
  );
}

type ConfirmProps = {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "brand";
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ title, message, confirmLabel, tone = "danger", busy = false, error, onConfirm, onCancel }: ConfirmProps) {
  const danger = tone === "danger";
  return (
    <Modal title={title} size="sm" busy={busy} onClose={onCancel}>
      <div className="flex gap-4">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${danger ? "bg-red-50 text-red-600" : "bg-brand/10 text-brand"}`}>
          <Icon d={danger ? ICON.trash : ICON.check} className="size-5" />
        </span>
        <div className="text-sm leading-relaxed text-slate-600">{message}</div>
      </div>
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" data-autofocus onClick={onCancel} disabled={busy} className={btn.secondary}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={danger ? btn.danger : btn.primary}>
          {busy && <Spinner />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
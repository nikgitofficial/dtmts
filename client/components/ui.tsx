const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60";

/** Shared button styles. Usage: <button className={btn.primary}> */
export const btn = {
  primary: `${base} bg-brand px-4 py-2.5 text-sm text-white shadow-sm hover:brightness-110 focus-visible:outline-brand`,
  secondary: `${base} bg-white px-4 py-2.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-brand`,
  danger: `${base} bg-red-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600`,
  dangerOutline: `${base} bg-white px-4 py-2.5 text-sm text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 focus-visible:outline-red-600`,
  // compact versions for table rows
  smSecondary: `${base} bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-brand`,
  smDanger: `${base} bg-white px-3 py-1.5 text-sm text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 focus-visible:outline-red-600`,
};

export const ICON = {
  plus: "M12 5v14M5 12h14",
  pencil: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  x: "M6 6l12 12M18 6L6 18",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  copy: "M9 9h10v11H9zM5 15H4V4h11v1",
  check: "M5 12l5 5 9-10",
  alert: "M12 8v5M12 16.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
};

export function Icon({ d, className = "size-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`${className} shrink-0`} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Spinner() {
  return (
    <svg className="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const on = status === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>
      <span className={`size-1.5 rounded-full ${on ? "bg-green-500" : "bg-slate-400"}`} />
      {on ? "Active" : "Inactive"}
    </span>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100">
      <Icon d={ICON.alert} className="mt-0.5 size-4" />
      {children}
    </p>
  );
}
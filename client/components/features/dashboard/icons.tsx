import type { ReactNode } from "react";

const ICONS = {
  users: (<><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8" /></>),
  userCheck: (<><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="m16.5 11 2 2 3.5-4" /></>),
  truck: (<><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>),
  pause: (<><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>),
  signalOff: (<><path d="M7 20v-4M12 20v-8M17 20V9" /><path d="M3 3l18 18" /></>),
  power: (<><path d="M12 3v8" /><path d="M6.4 6.6a8 8 0 1 0 11.2 0" /></>),
  pin: (<><path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function StatIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}
"use client";
import { useEffect, useState } from "react";

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

const CopyIcon = ({ done }: { done: boolean }) =>
  done ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4 text-green-600" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );

const iconBtn =
  "grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand";

/**
 * Masked PIN with an explicit reveal toggle (auto-hides after 10s).
 * Safe to place inside a clickable table row: clicks don't bubble.
 */
export default function PinCell({
  pin,
  copyable = false,
  codeClassName = "rounded-md bg-slate-100 px-2.5 py-1 font-mono tracking-widest text-slate-900",
}: {
  pin: string | number;
  copyable?: boolean;
  codeClassName?: string;
}) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const value = String(pin);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), 10_000);
    return () => clearTimeout(t);
  }, [shown]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: ignore */
    }
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <code className={codeClassName} aria-label={shown ? `PIN ${value}` : "PIN hidden"}>
        {shown ? value : "••••••"}
      </code>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        aria-label={shown ? "Hide PIN" : "Reveal PIN"}
        className={iconBtn}
      >
        <EyeIcon off={shown} />
      </button>
      {copyable && (
        <button type="button" onClick={copy} aria-label={copied ? "PIN copied" : "Copy PIN"} className={iconBtn}>
          <CopyIcon done={copied} />
        </button>
      )}
    </div>
  );
}
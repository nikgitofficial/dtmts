"use client";
import Link from "next/link";
import { btn, ICON, Icon } from ".";

export default function ErrorState({
  title = "Something went wrong",
  message = "This page hit an unexpected problem. Try again, and if it keeps happening, go back to the dashboard.",
  digest, onRetry, homeHref = "/dashboard",
}: { title?: string; message?: string; digest?: string; onRetry?: () => void; homeHref?: string }) {
  return (
    <div role="alert" className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-red-50 text-red-600"><Icon d={ICON.alert} className="size-6" /></span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {digest && <p className="mt-2 font-mono text-xs text-slate-400">Reference: {digest}</p>}
      <div className="mt-6 flex gap-3">
        {onRetry && <button onClick={onRetry} className={btn.primary}>Try again</button>}
        <Link href={homeHref} className={btn.secondary}>Back to dashboard</Link>
      </div>
    </div>
  );
}
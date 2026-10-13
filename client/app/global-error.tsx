"use client";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); /* TODO: send to your error tracker */ }, [error]);
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center px-4 font-sans antialiased">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight">The app hit a critical error</h1>
          <p className="mt-2 text-sm text-slate-600">Reload to try again. If it keeps happening, contact support.</p>
          {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Reference: {error.digest}</p>}
          <button onClick={reset} className="mt-6 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">Reload</button>
        </div>
      </body>
    </html>
  );
}
"use client";
import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

/** Catches render errors in any /dashboard page; the sidebar and topbar stay usable. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); /* TODO: send to your error tracker */ }, [error]);
  return <ErrorState digest={error.digest} onRetry={reset} />;
}
"use client";
import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); /* TODO: send to your error tracker (Sentry, etc.) */ }, [error]);
  return <main><ErrorState digest={error.digest} onRetry={reset} /></main>;
}
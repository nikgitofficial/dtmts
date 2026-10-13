"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { isUnauthorized } from "@/lib/api";

/**
 * Returns a handler for caught errors: on 401 it redirects to /login and returns null,
 * otherwise it returns a message to show.
 */
export function useApiError() {
  const router = useRouter();
  return useCallback((e: unknown): string | null => {
    if (isUnauthorized(e)) { router.replace("/login"); return null; }
    return e instanceof Error ? e.message : "Something went wrong";
  }, [router]);
}
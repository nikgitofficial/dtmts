"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { api, parse } from "@/lib/api";
import { meResponseSchema } from "@/schemas/auth";
import type { User } from "@/types/user";

export function useCurrentUser() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<unknown>("/me")
      .then((d) => setUser(parse(meResponseSchema, d).user))
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = useCallback(async () => {
    await api("/logout", "POST").catch(() => {});
    toast.info("You've been signed out");
    router.replace("/login");
    router.refresh();
  }, [router, toast]);

  return { user, logout };
}
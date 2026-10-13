"use client";
import { createContext, useContext } from "react";
import type { User } from "@/types/user";

export const UserContext = createContext<User | null>(null);

/** Use inside any /dashboard page to get the signed-in user. */
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside DashboardShell");
  return user;
}
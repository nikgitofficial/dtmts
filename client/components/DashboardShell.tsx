"use client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { api, type User } from "@/lib/api";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";

const UserContext = createContext<User | null>(null);

/** Use inside any /dashboard page to get the signed-in user. */
export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside DashboardShell");
  return user;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<{ user: User }>("/me").then((d) => setUser(d.user)).catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await api("/logout", "POST").catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  if (!user) return <main className="grid min-h-dvh place-items-center text-slate-500">Loading…</main>;

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-dvh bg-slate-50">
        <Sidebar user={user} onLogout={logout} />

        <div className="flex min-h-dvh flex-col lg:pl-64">
          <Topbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
    </UserContext.Provider>
  );
}
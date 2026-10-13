"use client";
import { UserContext } from "@/context/user";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Footer from "./Footer";
import ShellSkeleton from "./ShellSkeleton";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useCurrentUser();

  if (!user) return <ShellSkeleton />;

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
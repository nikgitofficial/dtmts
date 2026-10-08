"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type User } from "@/lib/api";

export default function Dashboard() {
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
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Hi, {user.name}</h1>
        <button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-slate-300 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-brand">Sign out</button>
      </div>
      <p className="mt-2 text-slate-600">You're signed in as {user.email}.</p>
      <Link href="/dashboard/drivers" className="mt-6 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">Manage drivers</Link>
      <Link href="/dashboard/tracking" className="mt-6 ml-3 inline-block rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">Live tracking</Link>
    </main>
  );
}
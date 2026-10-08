"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/${mode}`, "POST", Object.fromEntries(f));
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15";
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{isLogin ? "Sign in" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-slate-500">{isLogin ? "Welcome back." : "Use at least 10 characters for your password."}</p>
        </header>
        {!isLogin && (
          <label className="block space-y-1.5 text-sm font-medium">Name
            <input name="name" required maxLength={80} autoComplete="name" className={input} />
          </label>
        )}
        <label className="block space-y-1.5 text-sm font-medium">Email
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">Password
          <input name="password" type="password" required minLength={isLogin ? 1 : 10} autoComplete={isLogin ? "current-password" : "new-password"} className={input} />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60">
          {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-500">
          {isLogin ? "New here?" : "Already registered?"}{" "}
          <Link href={isLogin ? "/register" : "/login"} className="font-medium text-brand hover:underline">{isLogin ? "Create an account" : "Sign in"}</Link>
        </p>
      </form>
    </main>
  );
}

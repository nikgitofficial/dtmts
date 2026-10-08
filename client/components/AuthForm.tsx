"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { api } from "@/lib/api";

// Put your logo in /public and update these three values.
// Tip: an SVG with a transparent background looks best here.
const LOGO = { src: "/logo.png", alt: "JAKKAR", width: 160, height: 40 };

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-slate-50 disabled:text-slate-500";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const errorId = useId();
  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
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

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* soft brand glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[40rem] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand/15 blur-3xl"
      />

      <div className="w-full max-w-sm">
     <Link
  href="/"
  aria-label="Jakkar Marketing Corporation home"
  className="mb-8 flex flex-col items-center gap-3 rounded-md text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
>
  <Image
    src={LOGO.src}
    alt=""
    width={LOGO.width}
    height={LOGO.height}
    priority
    className="h-14 w-auto"
  />
  <span className="space-y-1">
    <span className="block text-xl font-semibold tracking-tight text-slate-900">
      Jakkar Marketing Corporation
    </span>
    <span className="block text-sm text-slate-500">
      Delivery truck monitoring and trucking system
    </span>
  </span>
</Link>



        <form
          onSubmit={onSubmit}
          aria-busy={busy}
          className="space-y-5 rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200"
        >
          <header className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {isLogin ? "Sign in to continue to your dashboard." : "Use at least 10 characters for your password."}
            </p>
          </header>

          <fieldset disabled={busy} className="space-y-5">
            {!isLogin && (
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Name
                <input name="name" required maxLength={80} autoComplete="name" placeholder="Jane Doe" className={field} />
              </label>
            )}

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className={field}
              />
            </label>

            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Password
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isLogin ? 1 : 10}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  aria-describedby={error ? errorId : undefined}
                  className={`${field} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-slate-400 transition hover:text-slate-600 focus-visible:text-slate-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
          </fieldset>

          <div aria-live="polite">
            {error && (
              <p
                id={errorId}
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 size-4 shrink-0" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a.9.9 0 0 0-.9.98l.35 3.5a.55.55 0 0 0 1.1 0l.35-3.5A.9.9 0 0 0 10 6Zm0 7.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
          </div>

          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy && <Spinner />}
            {busy ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isLogin ? "New here?" : "Already registered?"}{" "}
          <Link href={isLogin ? "/register" : "/login"} className="font-medium text-brand hover:underline">
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.5 7.2A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
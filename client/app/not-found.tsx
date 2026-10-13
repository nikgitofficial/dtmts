import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/dashboard" className={`${btn.primary} mt-6`}>Back to dashboard</Link>
      </div>
    </main>
  );
}
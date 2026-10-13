/** Base shimmer block. Always decorative; wrap groups in <SkeletonRegion> for screen readers. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-slate-200/70 motion-reduce:animate-none ${className}`} />;
}

export function SkeletonRegion({ label = "Loading…", className = "", children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Table rows. `widths` holds one Tailwind width class per column (e.g. "w-32"). The first column renders two lines. */
export function TableRowsSkeleton({ rows = 6, widths }: { rows?: number; widths: string[] }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} aria-hidden>
          {widths.map((w, c) => (
            <td key={c} className="px-4 py-4">
              {c === 0 ? (
                <div className="space-y-2"><Skeleton className={`h-4 ${w}`} /><Skeleton className="h-3 w-40" /></div>
              ) : (
                <Skeleton className={`h-4 ${w}`} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-hidden>
      <div className="flex items-center gap-3"><Skeleton className="size-11 rounded-xl" /><Skeleton className="h-4 w-24" /></div>
      <Skeleton className="mt-4 h-9 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" aria-hidden>
      <div className="space-y-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-56" /></div>
      {action && <Skeleton className="h-10 w-36 rounded-lg" />}
    </div>
  );
}

/** A grid of label + input placeholders, matching the driver form. */
export function FormFieldsSkeleton({ fields = 10 }: { fields?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full rounded-lg" /></div>
      ))}
    </div>
  );
}

/** Label/value pairs, matching the details modals. */
export function DetailsSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-36" /></div>
      ))}
    </div>
  );
}

export function ListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} aria-hidden className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </li>
      ))}
    </>
  );
}

export function MapSkeleton() {
  return (
    <div className="grid h-full w-full place-items-center bg-slate-100" role="status" aria-busy="true">
      <span className="sr-only">Loading map…</span>
      <div className="w-2/3 max-w-sm space-y-3" aria-hidden>
        <Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
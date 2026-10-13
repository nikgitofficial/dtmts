import { ListRowsSkeleton, MapSkeleton, Skeleton, SkeletonRegion } from "@/components/ui/Skeleton";

/** Same outer layout as TrackingView so nothing jumps when the data arrives. */
export function TrackingPageSkeleton() {
  return (
    <SkeletonRegion className="flex h-[calc(100dvh-3.8125rem)] flex-col bg-slate-50 lg:h-dvh" label="Loading live tracking…">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3" aria-hidden>
        <div className="flex items-center gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-32" /></div>
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="order-2 flex min-h-0 flex-1 flex-col border-t border-slate-200 bg-white lg:order-1 lg:w-[380px] lg:flex-none lg:border-r lg:border-t-0">
          <div className="space-y-3 border-b border-slate-100 p-4" aria-hidden>
            <Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-10 w-full rounded-lg" />
            <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-16 rounded-full" />)}</div>
          </div>
          <ul className="min-h-0 flex-1 overflow-hidden"><ListRowsSkeleton rows={6} /></ul>
        </div>
        <div className="relative order-1 h-[50dvh] lg:order-2 lg:h-auto lg:flex-1"><MapSkeleton /></div>
      </div>
    </SkeletonRegion>
  );
}
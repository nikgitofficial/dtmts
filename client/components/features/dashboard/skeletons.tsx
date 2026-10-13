import { PageHeaderSkeleton, Skeleton, SkeletonRegion, StatCardSkeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <SkeletonRegion className="mx-auto max-w-6xl px-4 py-10 lg:px-8" label="Loading overview…">
      <PageHeaderSkeleton action />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-hidden>
        <Skeleton className="h-4 w-28" /><Skeleton className="mt-4 h-3 w-full rounded-full" />
        <div className="mt-4 flex gap-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" /></div>
      </div>
    </SkeletonRegion>
  );
}
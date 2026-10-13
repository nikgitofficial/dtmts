import { Skeleton, SkeletonRegion, PageHeaderSkeleton, StatCardSkeleton } from "@/components/ui/Skeleton";

/** Shown while the signed-in user is being fetched. */
export default function ShellSkeleton() {
  return (
    <SkeletonRegion className="min-h-dvh bg-slate-50" label="Loading your dashboard…">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-4 lg:block" aria-hidden>
        <Skeleton className="h-10 w-44" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      </aside>
      <div className="lg:pl-64">
        <div className="hidden h-16 border-b border-slate-200 bg-white lg:block" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
          <PageHeaderSkeleton />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
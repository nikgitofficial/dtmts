import { PageHeaderSkeleton, Skeleton, SkeletonRegion, StatCardSkeleton, TableRowsSkeleton } from "@/components/ui/Skeleton";

export const LOG_ROW_WIDTHS = ["w-32", "w-28", "w-24", "w-28", "w-16", "w-16", "w-20"];

export function LogsPageSkeleton() {
  return (
    <SkeletonRegion className="mx-auto max-w-7xl px-4 py-10 lg:px-8" label="Loading session logs…">
      <PageHeaderSkeleton action />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" /><Skeleton className="h-10 w-44 rounded-lg" /><Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full"><tbody className="divide-y divide-slate-100"><TableRowsSkeleton rows={7} widths={LOG_ROW_WIDTHS} /></tbody></table>
      </div>
    </SkeletonRegion>
  );
}
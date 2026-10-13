import { PageHeaderSkeleton, Skeleton, SkeletonRegion, TableRowsSkeleton, FormFieldsSkeleton } from "@/components/ui/Skeleton";

export const DRIVER_ROW_WIDTHS = ["w-36", "w-28", "w-20", "w-16", "w-14", "w-16", "w-24 ml-auto"];

export function DriversPageSkeleton() {
  return (
    <SkeletonRegion className="mx-auto max-w-6xl px-4 py-10 lg:px-8" label="Loading drivers…">
      <PageHeaderSkeleton action />
      <Skeleton className="mt-6 h-10 w-full max-w-sm rounded-lg" />
      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <table className="w-full"><tbody className="divide-y divide-slate-100"><TableRowsSkeleton rows={7} widths={DRIVER_ROW_WIDTHS} /></tbody></table>
      </div>
    </SkeletonRegion>
  );
}

export function DriverFormPageSkeleton() {
  return (
    <SkeletonRegion className="mx-auto max-w-2xl px-4 py-12" label="Loading form…">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
        <FormFieldsSkeleton fields={10} />
        <div className="mt-5 flex gap-3"><Skeleton className="h-10 w-36 rounded-lg" /><Skeleton className="h-10 w-24 rounded-lg" /></div>
      </div>
    </SkeletonRegion>
  );
}
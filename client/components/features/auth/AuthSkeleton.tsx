import { Skeleton, SkeletonRegion } from "@/components/ui/Skeleton";

export default function AuthSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <SkeletonRegion className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm" aria-hidden>
        <div className="mb-8 flex flex-col items-center gap-3">
          <Skeleton className="h-14 w-36" /><Skeleton className="h-6 w-64" /><Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-5 rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
          <div className="space-y-2 text-center"><Skeleton className="mx-auto h-7 w-44" /><Skeleton className="mx-auto h-4 w-60" /></div>
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-10 w-full rounded-lg" /></div>
          ))}
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </SkeletonRegion>
  );
}
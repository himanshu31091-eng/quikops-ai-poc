import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the case layout exactly — header band, two-column body, sticky side
 * panel — so nothing moves when the record lands.
 */
function CardSkeleton({ rows = 3, header = true }: { rows?: number; header?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {header ? (
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Skeleton className="size-6 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      ) : null}
      <div className="space-y-2.5 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-3 w-full" style={{ maxWidth: `${100 - index * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function CaseDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-6 w-[28rem] max-w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-24 rounded-sm" />
              <Skeleton className="h-5 w-28 rounded-sm" />
              <Skeleton className="h-5 w-32 rounded-sm" />
              <Skeleton className="h-5 w-36 rounded-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-28" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={5} />
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
        <div className="space-y-4 xl:col-span-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}

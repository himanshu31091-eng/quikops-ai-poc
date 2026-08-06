import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the Work Manager layout exactly — KPI band, toolbar, filter row, table
 * and side panel — so nothing moves when the data lands.
 */
function RowSkeleton() {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-line px-3 last:border-0">
      <Skeleton className="size-4 rounded-sm" />
      <Skeleton className="h-3 w-24" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-4 w-24 rounded-sm" />
      <Skeleton className="h-4 w-28 rounded-sm" />
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-14" />
    </div>
  );
}

export default function WorkManagerLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="mt-2.5 h-6 w-12" />
            <Skeleton className="mt-2 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 2xl:grid-cols-12">
        <div className="space-y-3 2xl:col-span-9">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-8 w-32" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-28" />
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="h-9 border-b border-line bg-surface-subtle" />
            {Array.from({ length: 9 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="space-y-4 2xl:col-span-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-line bg-surface">
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                <Skeleton className="size-6 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
              <div className="space-y-3 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

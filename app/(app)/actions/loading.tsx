import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the Action Center layout exactly — header, toolbar, four KPI tiles,
 * the queue and the three sidebar panels — so nothing moves when data lands.
 */
function RowSkeleton() {
  return (
    <div className="flex h-12 items-center gap-3 border-b border-line px-3 last:border-0">
      <Skeleton className="size-4 rounded-sm" />
      <Skeleton className="h-4 w-16 rounded-sm" />
      <Skeleton className="h-3 w-24" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-16 rounded-sm" />
      <Skeleton className="h-4 w-20 rounded-sm" />
    </div>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Skeleton className="size-6 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-2.5 w-48 max-w-full" />
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function ActionCenterLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-160 max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="mt-2.5 h-7 w-12" />
            <Skeleton className="mt-2 h-2.5 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-10">
        <div className="xl:col-span-7">
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <Skeleton className="size-6 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-56 max-w-full" />
              </div>
            </div>
            <div className="h-9 border-b border-line bg-surface-subtle" />
            {Array.from({ length: 10 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-3">
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={2} />
          <PanelSkeleton rows={2} />
        </div>
      </div>
    </div>
  );
}

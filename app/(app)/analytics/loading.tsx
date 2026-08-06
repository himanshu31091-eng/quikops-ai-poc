import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the Analytics layout exactly — header, filter row, four KPI cards,
 * the chart grid, tables and heatmaps — so nothing moves when the data lands.
 */
function CardSkeleton({ height }: { height: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Skeleton className="size-6 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-56 max-w-full" />
        </div>
      </div>
      <div className="p-4">
        <Skeleton className={`w-full ${height}`} />
      </div>
    </div>
  );
}

export default function AnalyticsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-136 max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface p-3.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-2.5 h-7 w-20" />
            <Skeleton className="mt-2 h-2.5 w-40 max-w-full" />
            <Skeleton className="mt-3 h-8 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <CardSkeleton height="h-56" />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <CardSkeleton height="h-56" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CardSkeleton height="h-56" />
        <CardSkeleton height="h-56" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CardSkeleton height="h-56" />
        <CardSkeleton height="h-56" />
        <CardSkeleton height="h-56" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CardSkeleton height="h-44" />
        <CardSkeleton height="h-44" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors Administration — header, four KPI tiles, the user table, then the two configuration panels. */
export default function AdministrationLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-160 max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="mt-2.5 h-7 w-16" />
            <Skeleton className="mt-2 h-2.5 w-32" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Skeleton className="size-6 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-64 max-w-full" />
          </div>
        </div>
        <div className="h-9 border-b border-line bg-surface-subtle" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex h-12 items-center gap-3 border-b border-line px-4 last:border-0"
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-40" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <Skeleton className="h-4 w-20 rounded-sm" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3.5 w-40" />
            </div>
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-4 w-16 rounded-sm" />
              <Skeleton className="h-4 w-20 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

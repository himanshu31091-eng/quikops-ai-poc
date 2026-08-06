import { Skeleton } from "@/components/ui/skeleton";

export default function MyWorkLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-[26rem] max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="mt-2.5 h-6 w-16" />
            <Skeleton className="mt-2 h-2.5 w-28" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                <Skeleton className="size-6 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, row) => (
                  <Skeleton key={row} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 xl:col-span-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-line bg-surface p-4">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="mt-3 h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

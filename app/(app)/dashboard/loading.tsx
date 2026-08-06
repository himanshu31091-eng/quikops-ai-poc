import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons match the final layout's exact dimensions so there is zero layout
 * shift on data arrival. Never a centred spinner — spinners read as slow even
 * when they are not.
 */
function CardSkeleton({ height }: { height: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Skeleton className="size-6 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>
      <div className="p-4">
        <Skeleton className={height} />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-[30rem] max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface p-4">
            <Skeleton className="h-3 w-24" />
            <div className="mt-3 flex items-end justify-between">
              <div className="space-y-2">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-7 w-[104px]" />
            </div>
            <div className="mt-3 border-t border-line pt-2.5">
              <Skeleton className="h-1 w-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface">
        <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <CardSkeleton height="h-52" />
        </div>
        <div className="xl:col-span-4">
          <CardSkeleton height="h-52" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <CardSkeleton height="h-56" />
        </div>
        <div className="xl:col-span-4">
          <CardSkeleton height="h-56" />
        </div>
      </div>
    </div>
  );
}

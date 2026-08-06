import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the Help Centre — header, search, and the article grid beside the guides panel. */
export default function HelpCenterLoading() {
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

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
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

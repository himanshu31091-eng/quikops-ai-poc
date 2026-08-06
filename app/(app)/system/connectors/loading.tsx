import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the Connector Health layout exactly — header, filters, four KPI
 * tiles, the connector grid, funnel, dead-letter queue and two tables — so
 * nothing moves when the data lands.
 */
function CardShell({ height }: { height: string }) {
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

export default function ConnectorHealthLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-160 max-w-full" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="mt-2.5 h-7 w-16" />
            <Skeleton className="mt-2 h-2.5 w-36" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Skeleton className="size-6 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <CardShell height="h-56" />
        </div>
        <div className="xl:col-span-8">
          <CardShell height="h-56" />
        </div>
      </div>

      <CardShell height="h-64" />
      <CardShell height="h-64" />
    </div>
  );
}

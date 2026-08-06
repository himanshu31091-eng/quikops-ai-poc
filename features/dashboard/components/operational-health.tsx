import Link from "next/link";
import { DeltaBadge } from "@/components/patterns/delta-badge";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import type { PlantHealth } from "@/src/domain/types";
import { OTIF_TARGET_PCT } from "@/src/lib/constants";
import { formatPercent } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * OTIF attainment by plant, worst first.
 *
 * Sorted ascending on purpose: the row a manager needs is the one that is
 * failing, and putting it first means the panel does not need to be read to be
 * useful. Each row links into Work Manager already scoped to that plant.
 */
export function OperationalHealth({ data }: { data: PlantHealth[] }) {
  const sorted = [...data].sort((a, b) => a.otifPct - b.otifPct);

  return (
    <div className="space-y-1">
      {sorted.map((row) => {
        const belowTarget = row.otifPct < OTIF_TARGET_PCT;
        const attainment = Math.min((row.otifPct / OTIF_TARGET_PCT) * 100, 100);

        return (
          <Link
            key={row.plant.code}
            href={`/work?plant=${row.plant.code}`}
            className="group flex flex-col gap-2 rounded-md border border-transparent px-2 py-2.5 transition-colors duration-150 hover:border-line hover:bg-surface-subtle"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-subtle font-mono text-2xs font-semibold text-content-secondary">
                {row.plant.countryCode}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-content">
                  {row.plant.name}
                </span>
                <span className="block truncate text-2xs text-content-tertiary">
                  {row.openCases} open · {row.criticalCases} critical
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={cn(
                    "block text-sm font-semibold tabular-nums leading-4",
                    belowTarget ? "text-critical-content" : "text-content",
                  )}
                >
                  {formatPercent(row.otifPct)}
                </span>
                <DeltaBadge value={row.otifDeltaPts} size="sm" />
              </span>
            </div>

            <div className="flex items-center gap-2 pl-8">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-active">
                <div
                  className={cn(
                    "h-full rounded-full",
                    belowTarget ? "bg-critical" : "bg-success",
                  )}
                  style={{ width: `${attainment}%` }}
                />
              </div>
              <MoneyCell
                amount={row.revenueAtRisk}
                compact
                emphasis="muted"
                className="w-14 shrink-0 text-right text-2xs"
              />
              <Icon
                name="ChevronRight"
                size="xs"
                className="shrink-0 text-content-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

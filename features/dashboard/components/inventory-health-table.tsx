import { MoneyCell } from "@/components/patterns/money-cell";
import type { InventoryHealthRow } from "@/src/domain/types";
import { formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * Days-of-coverage by plant, against target.
 *
 * The bar is scaled to the largest value in the set rather than to a fixed
 * ceiling, so the comparison between plants stays readable whatever the
 * absolute numbers are. Status thresholds live with the row data, not here.
 */
const STATUS_META = {
  AT_RISK: { label: "At risk", className: "bg-critical-subtle text-critical-content border-critical-line", bar: "bg-critical" },
  WATCH: { label: "Watch", className: "bg-high-subtle text-high-content border-high-line", bar: "bg-high" },
  HEALTHY: { label: "Healthy", className: "bg-success-subtle text-success-content border-success-line", bar: "bg-success" },
} as const;

const HEADERS = [
  { key: "plant", label: "Plant", className: "" },
  { key: "coverage", label: "Days of coverage", className: "w-[30%]" },
  { key: "target", label: "Target", className: "w-[9%] text-right" },
  { key: "skus", label: "Stockout-risk SKUs", className: "w-[14%] text-right" },
  { key: "excess", label: "Excess value", className: "w-[13%] text-right" },
  { key: "status", label: "Status", className: "w-[11%]" },
] as const;

export function InventoryHealthTable({ rows }: { rows: InventoryHealthRow[] }) {
  const maxDays = Math.max(...rows.map((r) => Math.max(r.inventoryDays, r.targetDays)));

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-surface-subtle">
            {HEADERS.map((header) => (
              <th
                key={header.key}
                scope="col"
                className={cn(
                  "px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-content-tertiary",
                  header.className,
                )}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = STATUS_META[row.status];
            const widthPct = (row.inventoryDays / maxDays) * 100;
            const targetPct = (row.targetDays / maxDays) * 100;

            return (
              <tr
                key={row.plantCode}
                className="border-b border-line last:border-0 transition-colors duration-150 hover:bg-surface-subtle"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-content-tertiary">
                      {row.plantCode}
                    </span>
                    <span className="text-sm font-medium text-content">
                      {row.plantName}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-active">
                      <div
                        className={cn("h-full rounded-full", status.bar)}
                        style={{ width: `${widthPct}%` }}
                      />
                      <span
                        className="absolute top-0 h-full w-px bg-content-secondary"
                        style={{ left: `${targetPct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-content">
                      {row.inventoryDays.toFixed(1)}d
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2.5 text-right">
                  <span className="text-xs tabular-nums text-content-secondary">
                    {row.targetDays}d
                  </span>
                </td>

                <td className="px-3 py-2.5 text-right">
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      row.stockoutRiskSkus > 4 ? "text-critical-content" : "text-content",
                    )}
                  >
                    {formatNumber(row.stockoutRiskSkus)}
                  </span>
                </td>

                <td className="px-3 py-2.5 text-right">
                  <MoneyCell
                    amount={row.excessValue}
                    compact
                    emphasis="muted"
                    className="text-xs"
                  />
                </td>

                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      // Fixed height, so the label cannot be allowed to wrap.
                      "inline-flex h-[18px] shrink-0 items-center whitespace-nowrap rounded-sm border px-1.5 text-2xs font-medium",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

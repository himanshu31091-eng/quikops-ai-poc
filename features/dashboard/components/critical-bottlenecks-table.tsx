import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { StatusBadge } from "@/components/patterns/status-badge";
import { EXCEPTION_META } from "@/src/config/app-config";
import type { CaseListItem } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";

/**
 * The cases holding up the most revenue, as a fixed-column table.
 *
 * Column widths are declared as percentages so the table keeps its shape as
 * case titles vary in length — the manager scans down a column, and a column
 * that moves between rows defeats that.
 */
const HEADERS = [
  // Percentages resolve against the table's min-width, so they are what decides
  // whether a badge fits. At 14% of 760px the status cell offered 82px to a
  // 132px "Pending verification" badge, which wrapped out of its fixed height.
  { key: "case", label: "Case", className: "w-[33%]" },
  { key: "plant", label: "Plant", className: "w-[7%]" },
  { key: "priority", label: "Priority", className: "w-[15%]" },
  { key: "status", label: "Status", className: "w-[18%]" },
  { key: "owner", label: "Owner", className: "w-[15%]" },
  { key: "risk", label: "At risk", className: "w-[12%] text-right whitespace-nowrap" },
] as const;

export function CriticalBottlenecksTable({ cases }: { cases: CaseListItem[] }) {
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      {/*
        Raised from 760px: the percentages above resolve against this, and at
        760 the status and priority columns were narrower than the badges they
        hold. The wrapper already scrolls horizontally below the minimum, so
        this widens the scroll threshold rather than introducing scrolling.
      */}
      <table className="w-full min-w-[880px] table-fixed border-collapse text-left">
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
          {cases.map((item) => {
            const exception = EXCEPTION_META[item.exceptionType];
            const overdue = item.slaBreachedAt !== null;

            return (
              <tr
                key={item.caseNo}
                className="group border-b border-line last:border-0 transition-colors duration-150 hover:bg-surface-subtle"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1 h-8 w-[3px] shrink-0 rounded-full",
                        item.priorityBand === "CRITICAL" ? "bg-critical" : "bg-high",
                      )}
                    />
                    <div className="min-w-0">
                      <Link
                        href={caseHref(item.caseNo)}
                        className="block truncate text-sm font-medium text-content transition-colors duration-150 group-hover:text-accent"
                      >
                        {item.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-2xs text-content-tertiary">
                          {item.caseNo}
                        </span>
                        <span className="flex items-center gap-1 text-2xs text-content-tertiary">
                          <Icon name={exception.icon} size="xs" />
                          {exception.label}
                        </span>
                        {item.recurrenceCount > 1 ? (
                          <span className="rounded-sm border border-high-line bg-high-subtle px-1 py-px text-2xs font-medium text-high-content">
                            {item.recurrenceCount}× detected
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-content-secondary">
                    {item.plantCode}
                  </span>
                </td>

                <td className="px-3 py-2.5">
                  <PriorityChip
                    band={item.priorityBand}
                    score={item.priorityScore}
                    factors={item.priorityFactors}
                    size="sm"
                  />
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={item.status} size="sm" />
                    <span
                      className={cn(
                        "text-2xs tabular-nums",
                        overdue ? "font-medium text-critical" : "text-content-tertiary",
                      )}
                    >
                      {formatDue(item.dueAt, DEMO_NOW)}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <OwnerAvatar user={item.owner} size="sm" />
                </td>

                <td className="px-3 py-2.5 text-right">
                  <MoneyCell
                    amount={item.revenueAtRisk}
                    emphasis="strong"
                    compact={false}
                    className="text-xs"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

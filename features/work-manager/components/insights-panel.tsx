"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { SectionCard } from "@/components/patterns/section-card";
import type { WorkPortfolioMetrics } from "@/src/data/queries/work";
import { formatHours, formatNumber, formatPercent } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { ActiveFilterChip, WorkQuickStats } from "../types";

interface InsightsPanelProps {
  className?: string;
  chips: ActiveFilterChip[];
  quickStats: WorkQuickStats;
  portfolio: WorkPortfolioMetrics;
  resultCount: number;
  totalCount: number;
  onRemoveChip: (chipId: string) => void;
  onClearAll: () => void;
}

function StatRow({
  label,
  icon,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  icon: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  tone?: "default" | "critical";
}) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
          tone === "critical"
            ? "bg-critical-subtle text-critical"
            : "bg-surface-hover text-content-secondary",
        )}
      >
        <Icon name={icon} size="sm" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
          {label}
        </p>
        <p className="mt-1 text-lg font-semibold leading-none tracking-tight text-content tabular-nums">
          {value}
        </p>
        <p className="mt-1.5 text-2xs leading-relaxed text-content-tertiary">{detail}</p>
      </div>
    </div>
  );
}

/**
 * The context column: exactly what has been narrowed, and what the narrowed set
 * is worth. Every number here is computed from the visible rows, so it moves
 * with the filters instead of quietly reporting the whole portfolio.
 */
export const InsightsPanel = React.memo(function InsightsPanel({
  className,
  chips,
  quickStats,
  portfolio,
  resultCount,
  totalCount,
  onRemoveChip,
  onClearAll,
}: InsightsPanelProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("grid gap-4", className)}>
      <SectionCard
        title={t("workManager.selectedFilters")}
        subtitle={
          chips.length === 0
            ? "Showing every case"
            : `${formatNumber(resultCount)} of ${formatNumber(totalCount)} cases match`
        }
        icon="Filter"
        flush
        action={
          chips.length > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-2xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
            >
              {t("actionCenter.clearAll")}
            </button>
          ) : null
        }
      >
        {chips.length === 0 ? (
          <p className="px-4 py-3.5 text-xs leading-relaxed text-content-tertiary">
            No filters applied. Use the KPI tiles or the filter bar to narrow to the
            work you own, and the link in the address bar will carry the same view to
            whoever you send it to.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5 px-4 py-3.5">
            {chips.map((chip) => (
              <li key={chip.id}>
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.id)}
                  title={`Remove ${chip.group.toLowerCase()} filter`}
                  className="group flex max-w-full items-center gap-1.5 rounded-sm border border-line-control bg-surface-subtle py-1 pl-2 pr-1.5 text-2xs transition-colors duration-150 hover:border-line-strong hover:bg-surface-hover"
                >
                  <span className="shrink-0 font-medium text-content-tertiary">
                    {chip.group}
                  </span>
                  <span className="truncate font-medium text-content">{chip.label}</span>
                  <Icon
                    name="X"
                    size="xs"
                    className="shrink-0 text-content-tertiary transition-colors duration-150 group-hover:text-critical"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title={t("workManager.quickStats")}
        subtitle={t("workManager.acrossTheCasesCurrentlyShown")}
        icon="ChartNoAxesColumn"
        flush
        bodyClassName="divide-y divide-line"
        footer={
          <p className="text-2xs leading-relaxed text-content-tertiary">
            Portfolio mean time to resolve is {formatHours(portfolio.mttrHours)} against{" "}
            {formatPercent(portfolio.slaAdherencePct)} SLA adherence this quarter.
          </p>
        }
      >
        <StatRow
          label={t("workManager.totalRevenueAtRisk")}
          icon="DollarSign"
          value={
            <MoneyCell
              amount={quickStats.revenueAtRisk}
              compact={quickStats.revenueAtRisk >= 1_000_000}
              className="text-lg font-semibold"
            />
          }
          detail={
            quickStats.revenueAtRisk === 0
              ? "No open exposure in this set."
              : `${formatPercent(quickStats.revenueAtRiskSharePct)} of all open exposure · open cases only`
          }
        />

        <StatRow
          label={t("workManager.criticalCases")}
          icon="TriangleAlert"
          tone={quickStats.criticalCount > 0 ? "critical" : "default"}
          value={formatNumber(quickStats.criticalCount)}
          detail={
            quickStats.criticalCount === 0 ? (
              "Nothing in the critical band."
            ) : (
              <>
                <MoneyCell
                  amount={quickStats.criticalRevenueAtRisk}
                  compact={false}
                  className="text-2xs font-medium text-content-secondary"
                />
                {" at risk"}
                {quickStats.unassignedCriticalCount > 0
                  ? ` · ${quickStats.unassignedCriticalCount} unassigned`
                  : " · all owned"}
              </>
            )
          }
        />

        <StatRow
          label={t("workManager.averageResolutionTime")}
          icon="Clock"
          value={
            quickStats.averageResolutionHours === null
              ? "—"
              : formatHours(quickStats.averageResolutionHours)
          }
          detail={
            quickStats.averageResolutionHours === null ||
            quickStats.averageSlaUsagePct === null
              ? "No case in this set has reached verification yet."
              : `${formatNumber(quickStats.resolvedSampleSize)} resolved case${
                  quickStats.resolvedSampleSize === 1 ? "" : "s"
                } · opened to verified, averaging ${formatPercent(
                  quickStats.averageSlaUsagePct,
                  0,
                )} of each case's own SLA target`
          }
        />

        <StatRow
          label="SLA pressure"
          icon="CalendarClock"
          tone={quickStats.overdueCount > 0 ? "critical" : "default"}
          value={formatNumber(quickStats.overdueCount)}
          detail={
            quickStats.overdueCount === 0 && quickStats.slaAtRiskCount === 0
              ? "Nothing breached and nothing due inside 24 hours."
              : `${formatNumber(quickStats.overdueCount)} breached · ${formatNumber(
                  quickStats.slaAtRiskCount,
                )} due within 24 hours`
          }
        />
      </SectionCard>
    </div>
  );
});

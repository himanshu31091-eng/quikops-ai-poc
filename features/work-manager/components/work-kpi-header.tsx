"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { WorkKpi } from "../types";

const TONE: Record<WorkKpi["tone"], { icon: string; value: string }> = {
  neutral: { icon: "bg-surface-hover text-content-secondary", value: "text-content" },
  accent: { icon: "bg-accent-subtle text-accent", value: "text-content" },
  critical: { icon: "bg-critical-subtle text-critical", value: "text-critical-content" },
  verify: {
    icon: "bg-status-verify-subtle text-status-verify",
    value: "text-content",
  },
  success: { icon: "bg-success-subtle text-success", value: "text-content" },
};

interface WorkKpiHeaderProps {
  kpis: WorkKpi[];
  onToggle: (key: WorkKpi["key"]) => void;
}

/**
 * Five counts that are also the five filters a manager actually uses. Each tile
 * is a toggle: the number and the working set below it always describe the same
 * cases.
 */
export const WorkKpiHeader = React.memo(function WorkKpiHeader({
  kpis,
  onToggle,
}: WorkKpiHeaderProps) {
  return (
    <div
      role="group"
      aria-label="Case counts and quick filters"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      {kpis.map((kpi) => {
        const tone = TONE[kpi.tone];
        return (
          <button
            key={kpi.key}
            type="button"
            aria-pressed={kpi.active}
            onClick={() => onToggle(kpi.key)}
            className={cn(
              "group flex min-w-0 flex-col rounded-lg border bg-surface px-3.5 py-3 text-left transition-colors duration-150",
              kpi.active
                ? "border-accent-line bg-accent-subtle"
                : "border-line hover:border-line-strong hover:bg-surface-subtle",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md",
                  kpi.active ? "bg-accent text-white" : tone.icon,
                )}
              >
                <Icon name={kpi.icon} size="sm" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-content-secondary">
                {kpi.label}
              </span>
              {kpi.active ? (
                <Icon name="Check" size="xs" className="shrink-0 text-accent" />
              ) : null}
            </span>

            <span
              className={cn(
                "anim-status mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums",
                kpi.active ? "text-accent-content" : tone.value,
              )}
            >
              {formatNumber(kpi.value)}
            </span>

            <span className="mt-1.5 truncate text-2xs text-content-tertiary">
              {kpi.footnote}
            </span>
          </button>
        );
      })}
    </div>
  );
});

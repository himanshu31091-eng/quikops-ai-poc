"use client";

import * as React from "react";
import { AnimatedNumber } from "@/components/patterns/animated-number";
import { Icon } from "@/components/patterns/icon";
import { cn } from "@/src/lib/cn";
import type { ActionKpi, ActionScope } from "../types";

/**
 * The four headline tiles.
 *
 * Each is a filter preset, not a read-only statistic — a manager who sees
 * "7 overdue" wants the seven, and clicking the number is the shortest path to
 * them. Clicking an active tile clears it, so the tile is a toggle rather than
 * a one-way trip needing a second control to undo.
 */

const TONE: Record<
  ActionKpi["tone"],
  { icon: string; activeRing: string }
> = {
  neutral: { icon: "bg-surface-hover text-content-secondary", activeRing: "border-line-strong" },
  accent: { icon: "bg-accent-subtle text-accent", activeRing: "border-accent" },
  critical: { icon: "bg-critical-subtle text-critical", activeRing: "border-critical" },
  high: { icon: "bg-high-subtle text-high", activeRing: "border-high" },
  success: { icon: "bg-success-subtle text-success", activeRing: "border-success" },
};

const ActionKpiTile = React.memo(function ActionKpiTile({
  kpi,
  onSelect,
}: {
  kpi: ActionKpi;
  onSelect: (scope: ActionScope) => void;
}) {
  const tone = TONE[kpi.tone];

  return (
    <button
      type="button"
      onClick={() => onSelect(kpi.scope)}
      aria-pressed={kpi.active}
      className={cn(
        "anim-reveal flex min-w-0 flex-col rounded-lg border bg-surface px-3.5 py-3 text-left transition-colors duration-150",
        "hover:bg-surface-hover focus-visible:outline-none",
        kpi.active ? tone.activeRing : "border-line",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", tone.icon)}
        >
          <Icon name={kpi.icon} size="sm" />
        </span>
        <span className="min-w-0 truncate text-2xs font-medium text-content-secondary">
          {kpi.label}
        </span>
      </span>

      <span className="mt-2.5 text-2xl font-semibold tracking-[-0.02em] text-content tabular-nums">
        <AnimatedNumber value={kpi.value} format="count" />
      </span>

      <span className="mt-1.5 truncate text-2xs text-content-tertiary">{kpi.footnote}</span>
    </button>
  );
});

export function ActionKpiHeader({
  kpis,
  onSelect,
}: {
  kpis: ActionKpi[];
  onSelect: (scope: ActionScope) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <ActionKpiTile key={kpi.key} kpi={kpi} onSelect={onSelect} />
      ))}
    </div>
  );
}

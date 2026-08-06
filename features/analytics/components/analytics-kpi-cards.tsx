"use client";

import * as React from "react";
import { DeltaBadge } from "@/components/patterns/delta-badge";
import { Icon } from "@/components/patterns/icon";
import { Sparkline } from "@/components/patterns/sparkline";
import type { AnalyticsKpi } from "../types";

/**
 * The four headline trend cards.
 *
 * Each shows the figure for the current selection, how it compares with the
 * portfolio baseline, and a sparkline where a meaningful series exists. Cards
 * without one — verification pass rate and recurrence, which are ratios over a
 * set rather than a time series — leave the space empty rather than invent a
 * shape, because a fabricated trend line is worse than no trend line.
 */

const AnalyticsKpiCard = React.memo(function AnalyticsKpiCard({
  kpi,
}: {
  kpi: AnalyticsKpi;
}) {
  return (
    <div className="anim-reveal flex min-w-0 flex-col rounded-lg border border-line bg-surface p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-2xs font-medium text-content-secondary">
          <Icon name={kpi.icon} size="sm" className="text-content-tertiary" />
          {kpi.label}
        </span>
        {kpi.deltaValue !== 0 ? (
          <DeltaBadge
            value={kpi.deltaValue}
            unit={kpi.deltaUnit}
            higherIsBetter={kpi.higherIsBetter}
            size="sm"
          />
        ) : null}
      </div>

      <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-content tabular-nums">
        {kpi.display}
      </p>

      <p className="mt-1 text-2xs leading-relaxed text-content-tertiary">{kpi.footnote}</p>

      {kpi.series.length >= 2 ? (
        <div className="mt-auto pt-3">
          <Sparkline
            data={kpi.series}
            tone={kpi.higherIsBetter ? "success" : "accent"}
            width={140}
            height={30}
            className="w-full"
          />
        </div>
      ) : null}
    </div>
  );
});

export function AnalyticsKpiCards({ kpis }: { kpis: AnalyticsKpi[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <AnalyticsKpiCard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}

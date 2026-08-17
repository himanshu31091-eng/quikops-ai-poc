"use client";

import * as React from "react";
import { priorityLabel } from "@/src/domain/labels";
import { useLabels, useTranslation } from "@/src/i18n/provider";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChartTooltip,
  type TooltipRenderProps,
} from "@/components/charts/chart-primitives";
import { PRIORITY_META } from "@/src/config/app-config";
import type { PriorityBand, PriorityDistributionSlice } from "@/src/domain/types";
import { formatMoney, formatNumber } from "@/src/lib/format";

/**
 * Open cases by priority band.
 *
 * Band colours are read from the same CSS custom properties the chips use, so
 * the chart and the badges beside it cannot drift apart when a token changes.
 */
const BAND_COLOR: Record<PriorityBand, string> = {
  CRITICAL: "var(--color-critical)",
  HIGH: "var(--color-high)",
  MEDIUM: "var(--color-medium)",
  LOW: "var(--color-low)",
};

/**
 * The tooltip is built rather than declared, because the band name and both row
 * labels come from the catalogue and Recharts calls `content` outside any
 * component of ours. The factory runs inside the chart's own render, so the hooks
 * it reads are ordered; the returned renderer holds no hooks at all.
 */
function PriorityTooltip(): (
  props: TooltipRenderProps<PriorityDistributionSlice>,
) => React.ReactElement | null {
  const { t } = useTranslation();
  const labels = useLabels();

  return function render(props) {
    if (!props.active || !props.payload?.length) return null;
    const slice = props.payload[0]?.payload;
    if (!slice) return null;

    return (
      <ChartTooltip
        title={priorityLabel(slice.band, labels)}
        data={[
          { label: t("kpi.openCases"), value: formatNumber(slice.count) },
          {
            label: t("kpi.revenueAtRisk"),
            value: formatMoney(slice.revenueAtRisk, undefined, { forceCompact: true }),
          },
        ]}
      />
    );
  };
}

export function PriorityDistribution({
  data,
}: {
  data: PriorityDistributionSlice[];
}) {
  const { t } = useTranslation();
  const labels = useLabels();
  const total = data.reduce((sum, slice) => sum + slice.count, 0);
  const totalRisk = data.reduce((sum, slice) => sum + slice.revenueAtRisk, 0);
  const active = data.filter((slice) => slice.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto h-[152px] w-[152px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={active}
              dataKey="count"
              nameKey="band"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {active.map((slice) => (
                <Cell key={slice.band} fill={BAND_COLOR[slice.band]} />
              ))}
            </Pie>
            <Tooltip content={PriorityTooltip()} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold leading-6 tracking-[-0.02em] text-content">
            {total}
          </span>
          <span className="mt-0.5 text-2xs text-content-tertiary">{t("mw.openCases")}</span>
        </div>
      </div>

      <ul className="space-y-px">
        {data.map((slice) => {
          const meta = PRIORITY_META[slice.band];
          const share = total > 0 ? (slice.count / total) * 100 : 0;

          return (
            <li
              key={slice.band}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors duration-150 hover:bg-surface-hover"
            >
              <span className={`size-2 shrink-0 rounded-sm ${meta.dotClassName}`} />
              <span className="flex-1 text-xs font-medium text-content">
                {priorityLabel(slice.band, labels)}
              </span>
              <span className="w-8 text-right text-xs font-semibold tabular-nums text-content">
                {slice.count}
              </span>
              <span className="w-9 text-right text-2xs tabular-nums text-content-tertiary">
                {share.toFixed(0)}%
              </span>
              <span className="w-16 text-right text-2xs font-medium tabular-nums text-content-secondary">
                {formatMoney(slice.revenueAtRisk, undefined, { forceCompact: true })}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between border-t border-line pt-2.5">
        <span className="text-2xs text-content-tertiary">{t("dashboard.totalExposure")}</span>
        <span className="text-sm font-semibold tabular-nums text-content">
          {formatMoney(totalRisk, undefined, { forceCompact: true })}
        </span>
      </div>
    </div>
  );
}

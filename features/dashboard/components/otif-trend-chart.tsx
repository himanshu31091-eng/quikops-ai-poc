"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_DEFAULTS,
  ChartLegend,
  ChartTooltip,
  type TooltipRenderProps,
  GRID_DEFAULTS,
} from "@/components/charts/chart-primitives";
import type { TrendPoint } from "@/src/domain/types";
import { OTIF_TARGET_PCT } from "@/src/lib/constants";
import { formatPercent } from "@/src/lib/format";

const RANGES = [
  { key: "30", label: "30d", days: 30 },
  { key: "60", label: "60d", days: 60 },
  { key: "90", label: "90d", days: 90 },
] as const;

function renderTooltip(
  props: TooltipRenderProps<TrendPoint>,
): React.ReactElement | null {
  if (!props.active || !props.payload?.length) return null;
  const point = props.payload[0]?.payload;
  if (!point) return null;

  const gap = point.value - OTIF_TARGET_PCT;

  return (
    <ChartTooltip
      title={formatPercent(point.value)}
      subtitle={new Date(point.date).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })}
      data={[
        {
          label: "Target",
          value: formatPercent(OTIF_TARGET_PCT, 0),
          swatch: "var(--color-chart-axis)",
        },
        {
          label: gap < 0 ? "Below target" : "Above target",
          value: `${gap > 0 ? "+" : ""}${gap.toFixed(1)} pts`,
          swatch: gap < 0 ? "var(--color-critical)" : "var(--color-success)",
        },
      ]}
      footnote="Source: Connected Enterprise Data · daily refresh"
    />
  );
}

/**
 * OTIF over time, against the target line.
 *
 * The reference line is what makes the series mean something — a trend without
 * the target only shows movement, not whether the movement is enough.
 */
export function OtifTrendChart({ data }: { data: TrendPoint[] }) {
  const { t } = useTranslation();
  const [rangeKey, setRangeKey] = React.useState<string>("90");
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[2];
  const sliced = React.useMemo(() => data.slice(-range.days), [data, range.days]);

  const min = Math.min(...sliced.map((d) => d.value), OTIF_TARGET_PCT);
  const max = Math.max(...sliced.map((d) => d.value), OTIF_TARGET_PCT);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <ChartLegend
          items={[
            { label: t("kpi.otif"), color: "var(--color-chart-1)" },
            { label: t("kpi.target95"), color: "var(--color-chart-axis)" },
          ]}
        />
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-subtle p-0.5">
          {RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRangeKey(option.key)}
              className={
                option.key === rangeKey
                  ? "h-6 rounded-sm bg-surface px-2 text-2xs font-semibold text-content shadow-raised"
                  : "h-6 rounded-sm px-2 text-2xs font-medium text-content-tertiary transition-colors duration-150 hover:text-content"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[224px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sliced} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="otifFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid {...GRID_DEFAULTS} />

            <XAxis
              dataKey="date"
              {...AXIS_DEFAULTS}
              tickMargin={8}
              minTickGap={40}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                })
              }
            />
            <YAxis
              {...AXIS_DEFAULTS}
              domain={[Math.floor(min - 1.5), Math.ceil(max + 1)]}
              tickMargin={4}
              width={40}
              tickFormatter={(value: number) => `${value.toFixed(0)}%`}
            />

            <Tooltip
              content={renderTooltip}
              cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }}
            />

            <ReferenceLine
              y={OTIF_TARGET_PCT}
              stroke="var(--color-chart-axis)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-chart-1)"
              strokeWidth={1.75}
              fill="url(#otifFill)"
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 3.5,
                strokeWidth: 2,
                stroke: "var(--color-surface)",
                fill: "var(--color-chart-1)",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

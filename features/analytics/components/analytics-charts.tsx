"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  GRID_DEFAULTS,
  type TooltipRenderProps,
} from "@/components/charts/chart-primitives";
import { EmptyState } from "@/components/patterns/empty-state";
import type { TrendPoint } from "@/src/domain/types";
import { formatMoney, formatNumber } from "@/src/lib/format";
import type { CategoryDatum, WeeklyDatum } from "../types";

/**
 * The chart set for Execution Analytics.
 *
 * Three components cover seven required charts, because the differences between
 * them are data and formatting, not structure. Axis, grid, tooltip and legend
 * all come from `components/charts/chart-primitives`, so these read identically
 * to the Executive Dashboard's charts without restating a single style.
 */

const CHART_HEIGHT = "h-56";

/** How a trend's values are rendered in axes and tooltips. */
export type TrendUnit = "percent" | "currency" | "hours" | "count";

const FORMATTERS: Record<TrendUnit, { axis: (v: number) => string; full: (v: number) => string }> = {
  percent: { axis: (v) => `${v.toFixed(0)}%`, full: (v) => `${v.toFixed(1)}%` },
  currency: {
    axis: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))),
    full: (v) => formatMoney(v),
  },
  hours: { axis: (v) => `${v.toFixed(0)}h`, full: (v) => `${v.toFixed(1)}h` },
  count: { axis: (v) => String(Math.round(v)), full: (v) => formatNumber(v) },
};

function axisDate(value: string): string {
  // Weekly buckets arrive as `2026-W32`; daily points as an ISO date.
  if (value.includes("W")) return `W${value.split("-W")[1]}`;
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function ChartFrame({
  isEmpty,
  emptyMessage,
  children,
}: {
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactElement;
}) {
  const { t } = useTranslation();
  if (isEmpty) {
    return (
      <div className={CHART_HEIGHT}>
        <EmptyState
          icon="ChartNoAxesColumn"
          title={t("analytics.nothingToChart")}
          description={emptyMessage}
          size="sm"
        />
      </div>
    );
  }
  return (
    <div className={`${CHART_HEIGHT} w-full min-w-0`}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------------------------------------------------- Trend chart */

interface TrendChartProps {
  data: TrendPoint[];
  unit: TrendUnit;
  label: string;
  colorVar?: string;
  /** Draws a dashed reference line, e.g. the 95% OTIF target. */
  target?: { value: number; label: string };
  emptyMessage: string;
  footnote?: string;
}

/** Covers OTIF, revenue at risk and resolution time — same shape, different unit. */
export function TrendChart({
  data,
  unit,
  label,
  colorVar = "var(--color-chart-1)",
  target,
  emptyMessage,
  footnote,
}: TrendChartProps) {
  const gradientId = React.useId();
  const format = FORMATTERS[unit];

  const values = data.map((point) => point.value);
  const min = Math.min(...values, target?.value ?? Number.POSITIVE_INFINITY);
  const max = Math.max(...values, target?.value ?? Number.NEGATIVE_INFINITY);
  const pad = Math.max((max - min) * 0.12, unit === "percent" ? 1 : 0.5);

  const renderTooltip = (props: TooltipRenderProps<TrendPoint>) => {
    if (!props.active || !props.payload?.length) return null;
    const point = props.payload[0]?.payload;
    if (!point) return null;

    const rows = [{ label, value: format.full(point.value), swatch: colorVar }];
    if (target) {
      const gap = point.value - target.value;
      rows.push({
        label: gap < 0 ? "Below target" : "Above target",
        value: `${gap > 0 ? "+" : ""}${gap.toFixed(1)}`,
        swatch: gap < 0 ? "var(--color-critical)" : "var(--color-success)",
      });
    }

    return (
      <ChartTooltip
        title={format.full(point.value)}
        subtitle={
          point.date.includes("W")
            ? `Week ${point.date.split("-W")[1]}`
            : new Date(point.date).toLocaleDateString("en-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
        }
        data={rows}
        {...(footnote ? { footnote } : {})}
      />
    );
  };

  return (
    <div>
      <div className="mb-3">
        <ChartLegend
          items={[
            { label, color: colorVar },
            ...(target
              ? [{ label: target.label, color: "var(--color-chart-axis)" }]
              : []),
          ]}
        />
      </div>

      <ChartFrame isEmpty={data.length === 0} emptyMessage={emptyMessage}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorVar} stopOpacity={0.16} />
              <stop offset="100%" stopColor={colorVar} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid {...GRID_DEFAULTS} />
          <XAxis
            dataKey="date"
            {...AXIS_DEFAULTS}
            tickMargin={8}
            minTickGap={40}
            tickFormatter={axisDate}
          />
          <YAxis
            {...AXIS_DEFAULTS}
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tickMargin={4}
            width={46}
            tickFormatter={format.axis}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: "var(--color-line-strong)", strokeWidth: 1 }}
          />
          {target ? (
            <ReferenceLine
              y={target.value}
              stroke="var(--color-chart-axis)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="value"
            stroke={colorVar}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            dot={data.length <= 14 ? { r: 2, fill: colorVar, strokeWidth: 0 } : false}
            isAnimationActive={false}
            activeDot={{
              r: 3.5,
              strokeWidth: 2,
              stroke: "var(--color-surface)",
              fill: colorVar,
            }}
          />
        </AreaChart>
      </ChartFrame>
    </div>
  );
}

/* ------------------------------------------------------ Category breakdown */

/** Covers cases by priority, by plant and by exception type. */
export function CategoryBreakdownChart({
  data,
  emptyMessage,
}: {
  data: CategoryDatum[];
  emptyMessage: string;
}) {
  const { t } = useTranslation();
  const renderTooltip = (props: TooltipRenderProps<CategoryDatum>) => {
    if (!props.active || !props.payload?.length) return null;
    const datum = props.payload[0]?.payload;
    if (!datum) return null;
    return (
      <ChartTooltip
        title={datum.label}
        data={[
          { label: t("shell.cases"), value: formatNumber(datum.count), swatch: datum.color },
          { label: t("case.revenueAtRisk"), value: formatMoney(datum.revenueAtRisk) },
        ]}
      />
    );
  };

  return (
    <ChartFrame isEmpty={data.length === 0} emptyMessage={emptyMessage}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
        barCategoryGap="22%"
      >
        <CartesianGrid {...GRID_DEFAULTS} horizontal={false} vertical />
        <XAxis type="number" {...AXIS_DEFAULTS} tickMargin={6} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          {...AXIS_DEFAULTS}
          width={110}
          tickMargin={6}
        />
        <Tooltip content={renderTooltip} cursor={{ fill: "var(--color-surface-hover)" }} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {data.map((datum) => (
            <Cell key={datum.key} fill={datum.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------- Weekly throughput */

/** Cases opened against cases closed, per week. */
export function WeeklyThroughputChart({
  data,
  emptyMessage,
}: {
  data: WeeklyDatum[];
  emptyMessage: string;
}) {
  const { t } = useTranslation();
  const renderTooltip = (props: TooltipRenderProps<WeeklyDatum>) => {
    if (!props.active || !props.payload?.length) return null;
    const datum = props.payload[0]?.payload;
    if (!datum) return null;
    const net = datum.closed - datum.opened;
    return (
      <ChartTooltip
        title={`Week ${datum.week.split("-W")[1]}`}
        data={[
          { label: t("case.openedAt"), value: String(datum.opened), swatch: "var(--color-chart-3)" },
          { label: t("status.CLOSED"), value: String(datum.closed), swatch: "var(--color-chart-6)" },
        ]}
        footnote={
          net === 0
            ? "Level — closed as many as arrived"
            : net > 0
              ? `Net ${net} ahead — clearing the backlog`
              : `Net ${Math.abs(net)} behind — backlog growing`
        }
      />
    );
  };

  return (
    <ChartFrame isEmpty={data.length === 0} emptyMessage={emptyMessage}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid {...GRID_DEFAULTS} />
        <XAxis dataKey="label" {...AXIS_DEFAULTS} tickMargin={8} minTickGap={16} />
        <YAxis {...AXIS_DEFAULTS} width={32} tickMargin={4} allowDecimals={false} />
        <Tooltip content={renderTooltip} cursor={{ fill: "var(--color-surface-hover)" }} />
        <Legend
          verticalAlign="top"
          align="left"
          height={26}
          iconType="square"
          iconSize={8}
          formatter={(value: string) => (
            <span className="text-2xs text-content-secondary">{value}</span>
          )}
        />
        <Bar
          dataKey="opened"
          name={t("case.openedAt")}
          fill="var(--color-chart-3)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="closed"
          name={t("status.CLOSED")}
          fill="var(--color-chart-6)"
          radius={[3, 3, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
}

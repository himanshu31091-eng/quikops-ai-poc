"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { Icon } from "@/components/patterns/icon";
import type { FlowForecast, FlowLedger, FlowUnit } from "@/src/domain/flow-balance";
import { formatMoney, formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * The two flow charts.
 *
 * **Net-flow ribbon** — detection is drawn above the axis and resolution below
 * it, so the balance between them is the shape rather than a number to compute.
 * Two stacked series would show the same data and hide exactly the thing the
 * chart exists for: whether the outlet is keeping up with the inlet.
 *
 * **Backlog trajectory** — the open balance as it actually moved, continued by
 * a dashed run-rate projection. The break between solid and dashed is the
 * boundary between measurement and extrapolation, and it is drawn rather than
 * captioned because a reader should not have to be told twice.
 */

interface FlowPoint {
  label: string;
  detected: number;
  resolved: number;
  net: number;
}

function NetFlowTooltip({
  unit,
  currency,
}: {
  unit: FlowUnit;
  currency: string;
}): (props: TooltipRenderProps<FlowPoint>) => React.ReactElement | null {
  const show = (value: number): string =>
    unit === "value"
      ? formatMoney(Math.abs(value), currency, { forceCompact: true })
      : formatNumber(Math.abs(value));

  return function render({ active, payload }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <ChartTooltip
        title={point.label}
        data={[
          { label: "Detected", value: show(point.detected), swatch: "var(--color-critical)" },
          { label: "Resolved", value: show(point.resolved), swatch: "var(--color-success)" },
          {
            label: "Net",
            value: `${point.net > 0 ? "+" : point.net < 0 ? "−" : ""}${show(point.net)}`,
            swatch: "var(--color-accent)",
          },
        ]}
      />
    );
  };
}

export function NetFlowRibbon({
  ledger,
  unit,
  currency,
}: {
  ledger: FlowLedger;
  unit: FlowUnit;
  currency: string;
}) {
  const isValue = unit === "value";

  // Resolution is plotted negative so the two series diverge from the axis.
  // The sign is presentational only — the ledger never carries it.
  const data: FlowPoint[] = ledger.buckets.map((bucket) => ({
    label: bucket.label,
    detected: isValue ? bucket.detectedValue : bucket.detected,
    resolved: -(isValue ? bucket.resolvedValue : bucket.resolved),
    net: isValue ? bucket.netValue : bucket.net,
  }));

  const tickFormatter = (value: number): string =>
    isValue
      ? formatMoney(Math.abs(value), currency, { forceCompact: true })
      : formatNumber(Math.abs(value));

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_DEFAULTS} />
            <XAxis dataKey="label" {...AXIS_DEFAULTS} interval="preserveStartEnd" />
            <YAxis {...AXIS_DEFAULTS} width={56} tickFormatter={tickFormatter} />
            <ReferenceLine y={0} stroke="var(--color-chart-axis)" strokeWidth={1} />
            <Tooltip
              cursor={{ fill: "var(--color-surface-hover)" }}
              content={NetFlowTooltip({ unit, currency })}
            />
            <Bar
              dataKey="detected"
              fill="var(--color-critical)"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="resolved"
              fill="var(--color-success)"
              radius={[0, 0, 3, 3]}
              maxBarSize={22}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: "Detected", color: "var(--color-critical)" },
          { label: "Resolved", color: "var(--color-success)" },
          { label: "Net movement", color: "var(--color-accent)" },
        ]}
      />
    </div>
  );
}

interface TrajectoryPoint {
  label: string;
  actual: number | null;
  projected: number | null;
}

function TrajectoryTooltip({
  unit,
  currency,
}: {
  unit: FlowUnit;
  currency: string;
}): (props: TooltipRenderProps<TrajectoryPoint>) => React.ReactElement | null {
  const show = (value: number): string =>
    unit === "value"
      ? formatMoney(value, currency, { forceCompact: true })
      : formatNumber(value);

  return function render({ active, payload }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    const isProjected = point.actual === null;
    return (
      <ChartTooltip
        title={point.label}
        data={[
          {
            label: isProjected ? "Projected open" : "Open",
            value: show(isProjected ? (point.projected ?? 0) : (point.actual ?? 0)),
            swatch: "var(--color-accent)",
          },
        ]}
        {...(isProjected ? { footnote: "Run-rate projection, not a measurement" } : {})}
      />
    );
  };
}

export function BacklogTrajectory({
  ledger,
  forecast,
  unit,
  currency,
}: {
  ledger: FlowLedger;
  forecast: FlowForecast;
  unit: FlowUnit;
  currency: string;
}) {
  const isValue = unit === "value";

  const actual: TrajectoryPoint[] = ledger.buckets.map((bucket) => ({
    label: bucket.label,
    actual: isValue ? bucket.openValueAtEnd : bucket.openAtEnd,
    projected: null,
  }));

  // The last measured point is repeated into the projected series so the two
  // lines meet rather than leaving a visual gap at the boundary.
  const lastActual = actual[actual.length - 1];
  if (lastActual) lastActual.projected = lastActual.actual;

  const projected: TrajectoryPoint[] = forecast.projection.map((point) => ({
    label: point.label,
    actual: null,
    projected: isValue ? point.openValue : point.open,
  }));

  const data = [...actual, ...projected];
  const tickFormatter = (value: number): string =>
    isValue ? formatMoney(value, currency, { forceCompact: true }) : formatNumber(value);

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="flow-open" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_DEFAULTS} />
            <XAxis dataKey="label" {...AXIS_DEFAULTS} interval="preserveStartEnd" />
            <YAxis {...AXIS_DEFAULTS} width={56} tickFormatter={tickFormatter} />
            {lastActual ? (
              <ReferenceLine
                x={lastActual.label}
                stroke="var(--color-line-strong)"
                strokeDasharray="3 3"
              />
            ) : null}
            <Tooltip
              cursor={{ stroke: "var(--color-line-strong)" }}
              content={TrajectoryTooltip({ unit, currency })}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="var(--color-accent)"
              strokeWidth={2}
              fill="url(#flow-open)"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-px shrink-0" />
        <span>
          Solid to the marker is measured. Dashed beyond it extrapolates the mean net
          rate over {forecast.basisBuckets} {ledger.horizon.bucketNoun}
          {forecast.basisBuckets === 1 ? "" : "s"}
          {forecast.volatilityPct > 100 ? ", which varied widely period to period" : ""}.
        </span>
      </p>
    </div>
  );
}

/**
 * The forecast, stated rather than drawn.
 *
 * Sits beside the trajectory so the claim and the evidence are read together —
 * a clear date on its own invites more trust than it has earned.
 */
export function ForecastVerdict({
  ledger,
  forecast,
}: {
  ledger: FlowLedger;
  forecast: FlowForecast;
}) {
  const noun = ledger.horizon.bucketNoun;
  const rate = Math.abs(forecast.netPerBucket).toFixed(1);

  const tone =
    forecast.direction === "clearing"
      ? "border-success-line bg-success-subtle text-success-content"
      : forecast.direction === "growing"
        ? "border-critical-line bg-critical-subtle text-critical-content"
        : "border-line bg-surface-hover text-content-secondary";

  const icon =
    forecast.direction === "clearing"
      ? "TrendingDown"
      : forecast.direction === "growing"
        ? "TrendingUp"
        : "Minus";

  const headline =
    forecast.direction === "clearing"
      ? forecast.bucketsToClear === null
        ? `Clearing at ${rate} per ${noun}`
        : `Clears in about ${forecast.bucketsToClear} ${noun}${forecast.bucketsToClear === 1 ? "" : "s"}`
      : forecast.direction === "growing"
        ? `Growing at ${rate} per ${noun}`
        : "Holding steady";

  return (
    <div className={cn("rounded-md border px-3 py-2.5", tone)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon name={icon} size="sm" />
        {headline}
      </p>
      <p className="mt-1 text-2xs leading-relaxed opacity-90">
        {forecast.direction === "holding"
          ? `Net movement is inside the noise band for a backlog of ${ledger.closing}, so neither direction is a trend yet.`
          : `Mean net movement of ${forecast.netPerBucket > 0 ? "+" : "−"}${rate} per ${noun}, measured over ${forecast.basisBuckets}.`}
      </p>
    </div>
  );
}

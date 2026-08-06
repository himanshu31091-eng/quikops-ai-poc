"use client";

import { cn } from "@/src/lib/cn";

export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
] as const;

export const AXIS_DEFAULTS = {
  stroke: "var(--color-chart-axis)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const GRID_DEFAULTS = {
  stroke: "var(--color-chart-grid)",
  strokeDasharray: "0",
  vertical: false,
} as const;

/**
 * Recharts hands tooltip content a readonly payload array whose entries are
 * loosely typed. This generic keeps our render functions strongly typed on the
 * row shape without casting at the call site.
 */
export interface TooltipRenderProps<TRow> {
  active?: boolean;
  payload?: readonly { payload?: TRow }[];
}

export interface TooltipDatum {
  label: string;
  value: string;
  swatch?: string;
}

interface ChartTooltipProps {
  title: string;
  subtitle?: string;
  data: TooltipDatum[];
  footnote?: string;
  className?: string;
}

/** Single tooltip surface reused by every chart so hover states stay consistent. */
export function ChartTooltip({
  title,
  subtitle,
  data,
  footnote,
  className,
}: ChartTooltipProps) {
  return (
    <div
      className={cn(
        "min-w-[168px] rounded-md border border-line-inverse bg-surface-inverse px-2.5 py-2 shadow-overlay",
        className,
      )}
    >
      <p className="text-xs font-semibold text-content-inverse">{title}</p>
      {subtitle ? (
        <p className="mt-px text-2xs text-content-inverse-secondary">{subtitle}</p>
      ) : null}

      <div className="mt-1.5 space-y-1">
        {data.map((datum) => (
          <div key={datum.label} className="flex items-center gap-2">
            {datum.swatch ? (
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: datum.swatch }}
              />
            ) : null}
            <span className="flex-1 text-2xs text-content-inverse-secondary">
              {datum.label}
            </span>
            <span className="text-2xs font-semibold tabular-nums text-content-inverse">
              {datum.value}
            </span>
          </div>
        ))}
      </div>

      {footnote ? (
        <p className="mt-1.5 border-t border-line-inverse pt-1.5 text-2xs text-content-inverse-secondary">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

/** Legend row used beneath charts. */
export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; value?: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-2xs text-content-secondary">{item.label}</span>
          {item.value ? (
            <span className="text-2xs font-semibold tabular-nums text-content">
              {item.value}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

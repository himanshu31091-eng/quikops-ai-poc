"use client";

import * as React from "react";
import { AnimatedNumber, type NumberFormat } from "@/components/patterns/animated-number";
import { Icon } from "@/components/patterns/icon";
import { Sparkline } from "@/components/patterns/sparkline";
import { DeltaBadge } from "@/components/patterns/delta-badge";
import type { TrendPoint } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";

/**
 * The headline tile, used by every module that has one.
 *
 * Execution Analytics, the Action Center and Connector Health each grew their
 * own copy of this — three implementations of the same 40 lines, already
 * drifting on padding and delta handling. One component now serves all of them,
 * which is also what makes a new module's KPI band a five-line change.
 *
 * A tile is a filter preset as often as it is a statistic: pass `onSelect` and
 * it renders as a toggle button, otherwise as a static panel. That distinction
 * is the only branch in here.
 */

export type KpiTileTone = "neutral" | "accent" | "critical" | "high" | "success";

const TONE: Record<KpiTileTone, { icon: string; ring: string }> = {
  neutral: { icon: "bg-surface-hover text-content-secondary", ring: "border-line-strong" },
  accent: { icon: "bg-accent-subtle text-accent", ring: "border-accent" },
  critical: { icon: "bg-critical-subtle text-critical", ring: "border-critical" },
  high: { icon: "bg-high-subtle text-high", ring: "border-high" },
  success: { icon: "bg-success-subtle text-success", ring: "border-success" },
};

export interface KpiTileModel {
  key: string;
  label: string;
  /**
   * Pre-formatted value. Use this when the unit is unusual (`11d`, `62.1%`).
   * Prefer `value` + `format` when the number should count up on mount.
   */
  display?: string;
  value?: number;
  format?: NumberFormat;
  footnote: string;
  icon: string;
  tone: KpiTileTone;
  /** Rendered when present and at least two points long. */
  series?: TrendPoint[];
  /** Change against a baseline. Omitted or zero renders nothing. */
  delta?: { value: number; unit: "pts" | "%" | "abs"; higherIsBetter: boolean };
  /** True when this tile's filter preset is currently applied. */
  active?: boolean;
}

interface KpiTileProps {
  kpi: KpiTileModel;
  /** Supplied only when the tile is a filter preset. */
  onSelect?: (key: string) => void;
  className?: string;
}

export const KpiTile = React.memo(function KpiTile({
  kpi,
  onSelect,
  className,
}: KpiTileProps) {
  const tone = TONE[kpi.tone];
  const interactive = onSelect !== undefined;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              tone.icon,
            )}
          >
            <Icon name={kpi.icon} size="sm" />
          </span>
          <span className="min-w-0 truncate text-2xs font-medium text-content-secondary">
            {kpi.label}
          </span>
        </span>

        {kpi.delta && kpi.delta.value !== 0 ? (
          <DeltaBadge
            value={kpi.delta.value}
            unit={kpi.delta.unit}
            higherIsBetter={kpi.delta.higherIsBetter}
            size="sm"
          />
        ) : null}
      </div>

      <p className="mt-2.5 text-2xl font-semibold tracking-[-0.02em] text-content tabular-nums">
        {kpi.display !== undefined ? (
          kpi.display
        ) : (
          <AnimatedNumber value={kpi.value ?? 0} format={kpi.format ?? "count"} />
        )}
      </p>

      <p className="mt-1.5 text-2xs leading-relaxed text-content-tertiary">{kpi.footnote}</p>

      {kpi.series && kpi.series.length >= 2 ? (
        <div className="mt-auto pt-3">
          <Sparkline
            data={kpi.series}
            tone={kpi.tone === "critical" ? "critical" : kpi.tone === "success" ? "success" : "accent"}
            width={140}
            height={30}
            className="w-full"
          />
        </div>
      ) : null}
    </>
  );

  const shell = cn(
    "anim-reveal flex min-w-0 flex-col rounded-lg border bg-surface px-3.5 py-3 text-left",
    kpi.active ? tone.ring : "border-line",
    interactive && "transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none",
    className,
  );

  if (!interactive) return <div className={shell}>{body}</div>;

  return (
    <button
      type="button"
      onClick={() => onSelect(kpi.key)}
      aria-pressed={kpi.active ?? false}
      className={shell}
    >
      {body}
    </button>
  );
});

/** The band itself. Column count follows the tile count so 4 and 5 both sit well. */
export function KpiTileRow({
  kpis,
  onSelect,
  className,
}: {
  kpis: KpiTileModel[];
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        kpis.length >= 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "xl:grid-cols-4",
        className,
      )}
    >
      {kpis.map((kpi) => (
        <KpiTile key={kpi.key} kpi={kpi} {...(onSelect ? { onSelect } : {})} />
      ))}
    </div>
  );
}

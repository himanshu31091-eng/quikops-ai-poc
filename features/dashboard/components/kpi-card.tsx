import Link from "next/link";
import {
  AnimatedNumber,
  type NumberFormat,
} from "@/components/patterns/animated-number";
import { DeltaBadge } from "@/components/patterns/delta-badge";
import { Icon } from "@/components/patterns/icon";
import { Sparkline } from "@/components/patterns/sparkline";
import type { KpiCardModel } from "@/src/domain/types";
import { formatPercent } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * A dashboard KPI, with its target and trend.
 *
 * Distinct from `KpiTile` in `components/patterns`: this is the large, staggered
 * hero card used only on the Executive Dashboard, where a KPI carries a target,
 * a sparkline and an animated value. The tile is the compact filter control
 * used inside modules.
 */
const STAGGER = ["", "anim-stagger-1", "anim-stagger-2", "anim-stagger-3"] as const;

const UNIT_FORMAT: Record<KpiCardModel["unit"], NumberFormat> = {
  PERCENT: "percent",
  CURRENCY: "currency-compact",
  COUNT: "count",
};

function toneFor(model: KpiCardModel): "accent" | "critical" | "success" | "neutral" {
  if (model.target !== null) {
    return model.value < model.target ? "critical" : "success";
  }
  const improving = model.higherIsBetter
    ? model.deltaValue > 0
    : model.deltaValue < 0;
  if (Math.abs(model.deltaValue) < 0.05) return "neutral";
  return improving ? "success" : "critical";
}

export function KpiCard({ model, index }: { model: KpiCardModel; index: number }) {
  const tone = toneFor(model);
  const belowTarget = model.target !== null && model.value < model.target;

  const attainment =
    model.target !== null
      ? Math.min((model.value / model.target) * 100, 100)
      : null;

  return (
    <Link
      href={model.href}
      className={cn(
        "anim-fade group flex flex-col justify-between rounded-lg border border-line bg-surface p-4 transition-colors duration-150",
        "hover:border-line-strong hover:bg-surface-subtle",
        STAGGER[index] ?? "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-content-secondary">{model.label}</p>
        <Icon
          name="ArrowUpRight"
          size="sm"
          className="text-content-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <AnimatedNumber
            value={model.value}
            format={UNIT_FORMAT[model.unit]}
            currency={model.currency}
            delayMs={index * 60}
            className={cn(
              "block text-2xl font-semibold leading-7 tracking-[-0.02em]",
              belowTarget ? "text-critical-content" : "text-content",
            )}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <DeltaBadge
              value={model.deltaValue}
              unit={model.deltaUnit}
              higherIsBetter={model.higherIsBetter}
              size="sm"
            />
            <span className="text-2xs text-content-tertiary">30d</span>
          </div>
        </div>

        <Sparkline data={model.series} tone={tone} className="mb-1 shrink-0" />
      </div>

      <div className="mt-3 border-t border-line pt-2.5">
        {attainment !== null ? (
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-active">
              <div
                className={cn(
                  "h-full rounded-full",
                  belowTarget ? "bg-critical" : "bg-success",
                )}
                style={{ width: `${attainment}%` }}
              />
            </div>
            <span className="shrink-0 text-2xs tabular-nums text-content-tertiary">
              Target {formatPercent(model.target!, 0)}
            </span>
          </div>
        ) : null}
        <p
          className={cn(
            "text-2xs text-content-tertiary",
            attainment !== null && "mt-1.5",
          )}
        >
          {model.footnote}
        </p>
      </div>
    </Link>
  );
}

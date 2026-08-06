"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORITY_META } from "@/src/config/app-config";
import type { PriorityBand, PriorityFactor } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

/**
 * The priority band, with the score behind it.
 *
 * Passing `factors` turns the chip into a popover explaining why the case
 * scored where it did. That is the point of showing a computed priority at
 * all — a number a manager cannot interrogate is a number they will not trust.
 */
interface PriorityChipProps {
  band: PriorityBand;
  score?: number;
  factors?: PriorityFactor[];
  size?: "sm" | "md";
  className?: string;
}

export function PriorityChip({
  band,
  score,
  factors,
  size = "md",
  className,
}: PriorityChipProps) {
  const meta = PRIORITY_META[band];

  const chip = (
    <span
      className={cn(
        "anim-status inline-flex items-center gap-1.5 rounded-sm border font-medium",
        size === "sm" ? "h-[18px] px-1.5 text-2xs" : "h-[22px] px-2 text-xs",
        meta.className,
        factors?.length ? "cursor-help hover:brightness-[0.97]" : "",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
      {score !== undefined ? (
        <span className="tabular-nums opacity-70">{score.toFixed(1)}</span>
      ) : null}
    </span>
  );

  if (!factors?.length) return chip;

  const total = factors.reduce((sum, f) => sum + f.weighted, 0);
  const max = Math.max(...factors.map((f) => f.weighted));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex">
          {chip}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[336px] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <Icon name="Target" size="sm" className="text-content-tertiary" />
          <div>
            <p className="text-xs font-semibold text-content">
              Priority score {total.toFixed(1)}
            </p>
            <p className="text-2xs text-content-tertiary">
              Deterministic rule set — not AI generated
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line">
          {factors.map((factor) => (
            <li key={factor.factor} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-content">{factor.factor}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-content">
                  +{factor.weighted.toFixed(1)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-active">
                  <div
                    className={cn("h-full rounded-full", meta.railClassName)}
                    style={{ width: `${(factor.weighted / max) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 text-2xs tabular-nums text-content-tertiary">
                  {factor.raw}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <p className="border-t border-line bg-surface-subtle px-3 py-2 text-2xs leading-relaxed text-content-tertiary">
          Weights are configurable per deployment. Every factor is auditable, so
          prioritisation can be defended in a review.
        </p>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { Icon } from "@/components/patterns/icon";
import { useTranslation } from "@/src/i18n/provider";
import { SectionCard } from "@/components/patterns/section-card";
import type { RelatedIndicator } from "@/src/data/queries/case-detail";
import { cn } from "@/src/lib/cn";

/**
 * What else moved while this case was being worked.
 *
 * The demo's closing argument is that a completed action is not the same as an
 * improvement, and this panel carries the second half of that: an improvement
 * in one measure is not the same as an improvement overall. Protecting a
 * delivery date by expediting supply and re-sequencing a line has to show up
 * somewhere, usually in inventory and changeover time.
 *
 * The panel is deliberately mute on cause. It names indicators under pressure
 * at the same plant in the same period and stops — because whether this case
 * moved them is a judgement about the operation, and the platform is not in a
 * position to make it. Saying "surfaced for review" where a lesser product
 * would say "caused by" is the difference between a tool a plant manager
 * trusts and one they argue with.
 */
export function RelatedIndicatorsCard({
  indicators,
}: {
  indicators: RelatedIndicator[];
}) {
  const { t } = useTranslation();
  if (indicators.length === 0) return null;

  return (
    <SectionCard
      title={t("caseDetail.relatedIndicators")}
      subtitle={t("caseDetail.movingAtThisPlantOver")}
      icon="Gauge"
    >
      <ul className="space-y-3">
        {indicators.map((indicator) => (
          <li
            key={indicator.label}
            className="rounded-md border border-line bg-surface-subtle px-3 py-2.5"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-medium text-content">{indicator.label}</p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
                  indicator.direction === "PRESSURE"
                    ? "border-high-line bg-high-subtle text-high-content"
                    : "border-line bg-surface text-content-secondary",
                )}
              >
                <Icon
                  name={indicator.direction === "PRESSURE" ? "TrendingDown" : "Minus"}
                  size="xs"
                />
                {indicator.direction === "PRESSURE" ? "Under pressure" : "Stable"}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-semibold tabular-nums text-content">
                {indicator.reading}
              </span>
              <span className="text-2xs text-content-tertiary">
                against {indicator.target}
              </span>
            </div>

            <p className="mt-1.5 text-2xs leading-relaxed text-content-secondary">
              {indicator.context}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 flex gap-2 border-t border-line pt-3 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-0.5 shrink-0" />
        <span>
          QuikOps surfaces indicators and open cases from the same plant and
          period. Whether this case moved them is for the operational team to
          judge — the platform does not assert a causal link.
        </span>
      </p>
    </SectionCard>
  );
}

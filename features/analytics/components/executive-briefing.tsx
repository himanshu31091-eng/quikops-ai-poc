"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import type {
  ExecutiveNarrative,
  FlowComparison,
  FlowLedger,
  FlowRecommendation,
  NarrativeTone,
} from "@/src/domain/flow-balance";
import { cn } from "@/src/lib/cn";

/**
 * The standing answer to the question every executive opens with.
 *
 * Three parts, in the order they are read: the verdict, what is driving it, and
 * what to do about it. The recommendation cards are the payload — a narrative
 * that ends without a next action is a report, and the product's whole claim is
 * that it turns a report into executed work.
 *
 * Every figure here is composed from the ledger beside it rather than written
 * by a model, and the card says so. That is not a limitation being apologised
 * for: it is what lets a director quote the sentence in a review without
 * checking it first. The live Copilot handles the questions this cannot
 * anticipate, and the card points at it.
 */

const TONE_SHELL: Record<NarrativeTone, string> = {
  critical: "border-critical-line bg-critical-subtle",
  high: "border-high-line bg-high-subtle",
  success: "border-success-line bg-success-subtle",
  info: "border-accent-line bg-accent-subtle",
};

const TONE_TEXT: Record<NarrativeTone, string> = {
  critical: "text-critical-content",
  high: "text-high-content",
  success: "text-success-content",
  info: "text-accent-content",
};

const TONE_ICON: Record<NarrativeTone, string> = {
  critical: "TriangleAlert",
  high: "CircleAlert",
  success: "TrendingDown",
  info: "Activity",
};

function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: FlowRecommendation;
  index: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const panelId = `flow-rec-${recommendation.id}`;

  return (
    <li
      className={cn(
        "anim-settle overflow-hidden rounded-lg border bg-surface",
        recommendation.tone === "critical" ? "border-critical-line" : "border-line",
        index === 1 ? "anim-stagger-1" : index === 2 ? "anim-stagger-2" : "",
      )}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <span
          className={cn(
            "mt-px flex size-6 shrink-0 items-center justify-center rounded-md",
            TONE_SHELL[recommendation.tone],
            TONE_TEXT[recommendation.tone],
          )}
        >
          <Icon name={TONE_ICON[recommendation.tone]} size="sm" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-5 text-content">
            {recommendation.title}
          </p>
          <p
            className={cn(
              "mt-0.5 text-2xs font-medium tabular-nums",
              TONE_TEXT[recommendation.tone],
            )}
          >
            {recommendation.impact}
          </p>

          {expanded ? (
            <p
              id={panelId}
              className="anim-fade mt-2 text-2xs leading-relaxed text-content-secondary"
            >
              {recommendation.rationale}
            </p>
          ) : null}

          <div className="mt-2 flex items-center gap-1.5">
            <Button variant="ghost" size="xs" asChild>
              <Link href={recommendation.href}>
                Open
                <Icon name="ArrowRight" size="xs" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-controls={expanded ? panelId : undefined}
            >
              {expanded ? "Less" : "Why this"}
              <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size="xs" />
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ExecutiveBriefing({
  narrative,
  recommendations,
  ledger,
  comparison,
  onAskCopilot,
}: {
  narrative: ExecutiveNarrative;
  recommendations: FlowRecommendation[];
  ledger: FlowLedger;
  comparison: FlowComparison;
  onAskCopilot?: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-7">
        <div className={cn("rounded-lg border px-4 py-3.5", TONE_SHELL[narrative.tone])}>
          <p
            className={cn(
              "flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide",
              TONE_TEXT[narrative.tone],
            )}
          >
            <Icon name="Sparkles" size="xs" />
            Executive read · last {ledger.horizon.days} days
          </p>

          <h3 className="mt-2 text-base font-semibold leading-6 text-content">
            {narrative.headline}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
            {narrative.body}
          </p>

          {narrative.drivers.length > 0 ? (
            <ul className="mt-3 space-y-2 border-t border-line pt-3">
              {narrative.drivers.map((driver) => (
                <li key={driver.label} className="flex items-start gap-2">
                  <Icon
                    name="ChevronRight"
                    size="xs"
                    className="mt-0.5 shrink-0 text-content-tertiary"
                  />
                  <span className="min-w-0">
                    <span className="block text-2xs font-semibold text-content">
                      {driver.label}
                    </span>
                    <span className="block text-2xs leading-relaxed text-content-secondary">
                      {driver.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
            <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
              <Icon name="Info" size="xs" className="mt-px shrink-0" />
              {narrative.basis}
            </p>
            {onAskCopilot ? (
              <Button variant="secondary" size="xs" onClick={onAskCopilot}>
                <Icon name="Bot" size="xs" />
                Ask the Copilot
              </Button>
            ) : null}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              label: "Detected",
              value: comparison.detected,
              prior: comparison.detectedPrior,
              higherIsBetter: false,
            },
            {
              label: "Resolved",
              value: comparison.resolved,
              prior: comparison.resolvedPrior,
              higherIsBetter: true,
            },
            {
              label: "Net movement",
              value: ledger.net,
              prior: comparison.netPrior,
              higherIsBetter: false,
            },
          ].map((entry) => {
            const change = entry.value - entry.prior;
            const good = entry.higherIsBetter ? change >= 0 : change <= 0;
            return (
              <div
                key={entry.label}
                className="rounded-md border border-line bg-surface px-2.5 py-2"
              >
                <dt className="text-2xs text-content-tertiary">{entry.label}</dt>
                <dd className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-base font-semibold tabular-nums text-content">
                    {entry.value > 0 && entry.label === "Net movement" ? "+" : ""}
                    {entry.value}
                  </span>
                  <span
                    className={cn(
                      "text-2xs font-medium tabular-nums",
                      change === 0
                        ? "text-content-tertiary"
                        : good
                          ? "text-success-content"
                          : "text-critical-content",
                    )}
                  >
                    {change === 0 ? "no change" : `${change > 0 ? "+" : ""}${change}`}
                  </span>
                </dd>
                <p className="mt-0.5 text-2xs text-content-tertiary">
                  {entry.prior} in the period before
                </p>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="min-w-0 xl:col-span-5">
        <p className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
          <Icon name="ListChecks" size="xs" />
          What moves it most
        </p>
        {recommendations.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-3.5 py-3 text-xs text-content-secondary">
            Nothing in the corpus meets a recommendation threshold right now — no
            breaches, no unowned cases, nothing waiting on verification.
          </p>
        ) : (
          <ul className="space-y-2">
            {recommendations.slice(0, 4).map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                index={index}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

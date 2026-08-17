"use client";

import Link from "next/link";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import type { AiExecutiveSummary } from "@/src/domain/types";
import { RegenerateSummaryButton } from "./dashboard-copilot";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";

/**
 * The executive summary panel.
 *
 * The summary is server-resolved and the callouts are tone-tagged by the
 * domain, so this component chooses presentation only. Regenerate hands off to
 * the dashboard Copilot rather than re-running anything locally.
 */
const CALLOUT_TONE = {
  critical: {
    wrapper: "border-critical-line bg-critical-subtle",
    label: "text-critical-content",
    icon: "TriangleAlert",
  },
  high: {
    wrapper: "border-high-line bg-high-subtle",
    label: "text-high-content",
    icon: "RefreshCw",
  },
  success: {
    wrapper: "border-success-line bg-success-subtle",
    label: "text-success-content",
    icon: "TrendingUp",
  },
} as const;

export function AiSummaryCard({ summary }: { summary: AiExecutiveSummary }) {
  const fmt = useFormat();
  const { t } = useTranslation();
  return (
    <SectionCard
      title={t("dash.aiExecutiveSummary")}
      subtitle={`${summary.scope} · generated ${formatWhen(summary.generatedAt, DEMO_NOW, fmt)}`}
      icon="Sparkles"
      action={<RegenerateSummaryButton />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs text-content-tertiary">{t("dashboard.groundedIn")}</span>
            {summary.citations.map((citation) =>
              citation.type === "case" ? (
                <Link
                  key={citation.ref}
                  href={caseHref(citation.ref)}
                  className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-2xs text-content-secondary transition-colors duration-150 hover:border-accent-line hover:bg-accent-subtle hover:text-accent-content"
                >
                  {citation.ref}
                </Link>
              ) : (
                <span
                  key={citation.ref}
                  title={citation.ref}
                  className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-2xs text-content-tertiary"
                >
                  {/*
                    The label, not the raw reference. `ref` is an internal
                    lookup key — "VP01/OTIF_PCT/2026-08-04" — and printing it
                    put a system code in front of a business reader. The exact
                    reference stays on the tooltip for anyone tracing a number.
                  */}
                  {citation.label}
                </span>
              ),
            )}
          </div>
        </div>
      }
    >
      <p className="text-base font-medium leading-6 tracking-[-0.008em] text-content">
        {summary.headline}
      </p>

      <div className="mt-3 space-y-2.5">
        {summary.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-sm leading-relaxed text-content-secondary"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {summary.callouts.map((callout) => {
          const tone = CALLOUT_TONE[callout.tone];
          return (
            <div
              key={callout.label}
              className={cn("rounded-md border p-2.5", tone.wrapper)}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide",
                  tone.label,
                )}
              >
                <Icon name={tone.icon} size="xs" />
                {callout.label}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
                {callout.detail}
              </p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

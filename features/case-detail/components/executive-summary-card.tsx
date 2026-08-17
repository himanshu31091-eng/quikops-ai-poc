"use client";

import * as React from "react";
import type { Translate } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import { cn } from "@/src/lib/cn";
import { SummaryBlock } from "./primitives";

const buildConfidenceMeta = (t: Translate) =>
  ({
    CONFIRMED: {
    label: "Confirmed",
    className: "border-success-line bg-success-subtle text-success-content",
  },
  PROBABLE: {
    label: t("caseDetail.probable"),
    className: "border-high-line bg-high-subtle text-high-content",
  },
  UNDER_INVESTIGATION: {
    label: "Under investigation",
    className: "border-line bg-surface-hover text-content-secondary",
  },
  }) as const;

/**
 * The case in the terms an executive reads it: what happened, what it costs,
 * why it happened, and why the platform raised it at all. Everything here is
 * recorded analysis — the AI Copilot is a separate, clearly-labelled surface.
 */
export const ExecutiveSummaryCard = React.memo(function ExecutiveSummaryCard({
  detail,
}: {
  detail: CaseDetailModel;
}) {
  const { t } = useTranslation();
  const summary = detail.summary;
  const confidence = buildConfidenceMeta(t)[summary.rootCauseConfidence];

  return (
    <SectionCard
      title={t("section.summary")}
      subtitle={t("caseDetail.recordedAnalysisNotModelOutput")}
      icon="FileText"
      bodyClassName="p-0"
      flush
      footer={
        <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
          <Icon name="Info" size="xs" className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium text-content-secondary">{t("caseDetail.whyThisWasRaised")}</span>{" "}
            {summary.whyRaised}
          </span>
        </p>
      }
    >
      <div className="border-b border-line px-4 py-3.5">
        <p className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
          {t("caseDetail.problem")}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-content">{summary.problem}</p>
      </div>

      <div className="grid gap-4 px-4 py-3.5 sm:grid-cols-2">
        <SummaryBlock label={t("caseDetail.businessImpact")} icon="DollarSign" tone="critical">
          {summary.businessImpact}
        </SummaryBlock>
        <SummaryBlock label={t("caseDetail.operationalImpact")} icon="Factory">
          {summary.operationalImpact}
        </SummaryBlock>

        <div className="min-w-0 sm:col-span-2">
          <p className="flex flex-wrap items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
            <span className="flex items-center gap-1.5">
              <Icon name="Target" size="xs" />
              {t("caseDetail.rootCause")}
            </span>
            <span
              className={cn(
                "rounded-sm border px-1.5 py-px text-2xs font-medium normal-case tracking-normal",
                confidence.className,
              )}
            >
              {confidence.label}
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
            {summary.rootCause}
          </p>
        </div>

        <SummaryBlock label={t("caseDetail.customerImpact")} icon="Users">
          {summary.customerImpact}
        </SummaryBlock>
        <SummaryBlock label={t("col.revenueImpact")} icon="TrendingDown" tone="critical">
          {summary.revenueImpact}
        </SummaryBlock>
        <SummaryBlock label={t("caseDetail.targetKpi")} icon="Gauge" tone="success">
          {summary.targetKpi}
        </SummaryBlock>
        <SummaryBlock label={t("cd.detectionRule")} icon="Zap">
          <span className="font-mono text-2xs">{summary.detectionRule}</span>
          <span className="mt-1 block">{detail.information.detectionRuleDetail}</span>
        </SummaryBlock>
      </div>
    </SectionCard>
  );
});

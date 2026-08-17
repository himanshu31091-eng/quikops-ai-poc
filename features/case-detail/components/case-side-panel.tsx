"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { priorityLabel } from "@/src/domain/labels";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { SectionCard } from "@/components/patterns/section-card";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { PRIORITY_META } from "@/src/config/app-config";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import type { CaseHealth } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatPercent, formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";
import type { CaseSessionState } from "../types";
import { computeSla } from "../utils/sla";
import { ProgressBar } from "./primitives";

interface CaseSidePanelProps {
  detail: CaseDetailModel;
  session: CaseSessionState;
  /** Re-scored on every change so the dial tracks the work, not the page load. */
  health: CaseHealth;
  onOpenCopilot: () => void;
  onUploadEvidence: () => void;
  onRequestVerification: () => void;
  onExport: () => void;
  className?: string;
}

/** The tone classes are constant; only the label follows the language, so the
 *  label is looked up at render and the rest stays a module constant. */
const HEALTH_LABEL_KEY = {
  ON_TRACK: "health.onTrack",
  AT_RISK: "health.atRisk",
  OFF_TRACK: "health.offTrack",
} as const;

const HEALTH_TONE = {
  ON_TRACK: {
    text: "text-success-content",
    ring: "text-success",
    tone: "success" as const,
  },
  AT_RISK: {
    text: "text-high-content",
    ring: "text-high",
    tone: "high" as const,
  },
  OFF_TRACK: {
    text: "text-critical-content",
    ring: "text-critical",
    tone: "critical" as const,
  },
};

const INSIGHT_TONE = {
  critical: "border-critical-line bg-critical-subtle",
  high: "border-high-line bg-high-subtle",
  info: "border-line bg-surface-subtle",
};

function RelatedList({
  title,
  icon,
  entries,
  emptyText,
}: {
  title: string;
  icon: string;
  entries: CaseDetailModel["related"];
  emptyText: string;
}) {
  return (
    <SectionCard title={title} subtitle={`${entries.length} linked`} icon={icon} flush>
      {entries.length === 0 ? (
        <p className="px-4 py-3.5 text-xs leading-relaxed text-content-tertiary">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.caseNo}>
              <Link
                href={caseHref(entry.caseNo)}
                className="group flex flex-col gap-1.5 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-subtle"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      PRIORITY_META[entry.priorityBand].dotClassName,
                    )}
                  />
                  <span className="font-mono text-2xs text-content-tertiary">{entry.caseNo}</span>
                  <StatusBadge status={entry.status} size="sm" showDot={false} />
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-snug text-content transition-colors duration-150 group-hover:text-accent">
                  {entry.title}
                </span>
                <span className="flex items-center justify-between gap-2 text-2xs text-content-tertiary">
                  <span className="truncate">{entry.relation}</span>
                  <MoneyCell
                    amount={entry.revenueAtRisk}
                    compact
                    className="shrink-0 text-2xs"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/**
 * The context column. Everything here answers "should I still be working on
 * this one?" — health, exposure, the SLA clock, and what else is connected to
 * the same supplier or material.
 */
export const CaseSidePanel = React.memo(function CaseSidePanel({
  detail,
  session,
  health,
  onOpenCopilot,
  onUploadEvidence,
  onRequestVerification,
  onExport,
  className,
}: CaseSidePanelProps) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  const item = detail.case;
  const tone = HEALTH_TONE[health.band];
  const healthLabel = t(HEALTH_LABEL_KEY[health.band]);
  const sla = computeSla(session.dueAt, session.status, session.priorityBand, DEMO_NOW);
  const openActions = session.actions.filter((action) => action.status !== "DONE").length;

  return (
    <div className={cn("grid gap-4", className)}>
      <SectionCard title={t("cd.caseHealth")} subtitle={t("cd.executionNotPriority")} icon="Gauge" flush>
        <div className="flex items-center gap-4 px-4 py-3.5">
          <div className="relative flex size-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="size-16 -rotate-90" aria-hidden="true">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="3"
                className="stroke-surface-active"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(health.score / 100) * 97.4} 97.4`}
                className={cn(
                  "stroke-current transition-[stroke-dasharray,stroke] duration-500 ease-out",
                  tone.ring,
                )}
              />
            </svg>
            <span className="anim-status absolute text-sm font-semibold tabular-nums text-content">
              {health.score}
            </span>
          </div>
          <div className="min-w-0">
            <p className={cn("anim-status text-sm font-semibold", tone.text)}>{healthLabel}</p>
            <p className="mt-0.5 text-2xs leading-relaxed text-content-tertiary">
              {t("cd.healthHint")}
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line border-t border-line">
          {health.drivers.map((driver) => (
            <li key={driver.label} className="flex items-start gap-2 px-4 py-2">
              <Icon
                name={driver.positive ? "CircleCheck" : "CircleAlert"}
                size="xs"
                className={cn(
                  "mt-0.5 shrink-0",
                  driver.positive ? "text-success" : "text-high",
                )}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-content">{driver.label}</span>
                <span className="block text-2xs leading-relaxed text-content-tertiary">
                  {driver.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={t("cd.exposureAndClock")} icon="Target" flush>
        <div className="divide-y divide-line">
          <div className="px-4 py-3">
            <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
              {t("cd.priorityScore")}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold leading-none tabular-nums text-content">
                {item.priorityScore.toFixed(1)}
              </span>
              <span className="text-2xs text-content-tertiary">/ 100</span>
              <span
                className={cn(
                  "ml-auto rounded-sm border px-1.5 py-px text-2xs font-medium",
                  PRIORITY_META[session.priorityBand].className,
                )}
              >
                {priorityLabel(session.priorityBand, labels)}
              </span>
            </p>
            <ProgressBar
              value={item.priorityScore}
              tone={
                session.priorityBand === "CRITICAL"
                  ? "critical"
                  : session.priorityBand === "HIGH"
                    ? "high"
                    : "accent"
              }
              className="mt-2"
            />
          </div>

          <div className="px-4 py-3">
            <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
              {t("case.revenueAtRisk")}
            </p>
            <p className="mt-1">
              <MoneyCell
                amount={item.revenueAtRisk}
                currency={item.currency}
                compact={false}
                emphasis={session.priorityBand === "CRITICAL" ? "risk" : "strong"}
                className="text-2xl font-semibold leading-none"
              />
            </p>
            <p className="mt-1.5 text-2xs text-content-tertiary">
              {t("cd.confirmedDemand")}
            </p>
          </div>

          <div className="px-4 py-3">
            <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
              {t("cd.slaCountdown")}
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold leading-none tabular-nums",
                sla.breached
                  ? "text-critical"
                  : sla.atRisk
                    ? "text-high-content"
                    : "text-content",
              )}
            >
              {sla.label}
            </p>
            <ProgressBar
              value={sla.consumedPct}
              tone={
                sla.stopped ? "success" : sla.breached ? "critical" : sla.atRisk ? "high" : "accent"
              }
              className="mt-2"
            />
            <p className="mt-1.5 text-2xs text-content-tertiary">
              {formatPercent(sla.consumedPct, 0)} of the {sla.targetHours}h target consumed ·{" "}
              {openActions} open action{openActions === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("cd.recentInsights")}
        subtitle={t("cd.insightsSub")}
        icon="Sparkles"
        flush
        footer={
          <button
            type="button"
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 text-2xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
          >
            {t("cd.askAboutCase")}
            <Icon name="ArrowRight" size="xs" />
          </button>
        }
      >
        <ul className="space-y-2 px-4 py-3.5">
          {detail.insights.map((insight) => (
            <li
              key={insight.id}
              className={cn("rounded-md border px-3 py-2.5", INSIGHT_TONE[insight.tone])}
            >
              <p className="flex items-center justify-between gap-2">
                <span className="text-2xs font-semibold uppercase tracking-wide text-content-secondary">
                  {insight.label}
                </span>
                <span className="shrink-0 text-2xs text-content-tertiary">
                  {formatWhen(insight.generatedAt, DEMO_NOW, fmt)}
                </span>
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
                {insight.body}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <RelatedList
        title={t("cd.relatedCases")}
        icon="Link2"
        entries={detail.related}
        emptyText="Nothing else in the network shares this material, customer or exception type."
      />

      <RelatedList
        title={t("cd.supplierIssues")}
        icon="TruckElectric"
        entries={detail.supplierIssues}
        emptyText={
          item.supplierName
            ? `No other cases are open against ${item.supplierName}.`
            : "This case has no supplier attached — the cause is internal."
        }
      />

      <SectionCard title={t("cd.quickActions")} icon="Zap" flush>
        <div className="grid gap-2 px-4 py-3.5">
          <Button variant="primary" size="md" onClick={onOpenCopilot} className="justify-start">
            <Icon name="Sparkles" size="sm" />
            {t("cd.askCopilot")}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onUploadEvidence}
            className="justify-start"
          >
            <Icon name="Upload" size="sm" />
            {t("action.uploadEvidence")}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onRequestVerification}
            disabled={session.actions.length === 0 || openActions > 0}
            className="justify-start"
          >
            <Icon name="ShieldCheck" size="sm" />
            {t("verification.request")}
          </Button>
          <Button variant="secondary" size="md" onClick={onExport} className="justify-start">
            <Icon name="Download" size="sm" />
            {t("cd.exportRecord")}
          </Button>
          <Button variant="secondary" size="md" asChild className="justify-start">
            <Link href="/work">
              <Icon name="ArrowLeft" size="sm" />
              {t("cd.backToWork")}
            </Link>
          </Button>
        </div>
      </SectionCard>
    </div>
  );
});

"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { ProgressBar } from "@/components/patterns/progress-bar";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActionRecommendation } from "@/src/data/queries/actions";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { formatDue, formatMoney } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import type { ActionRow, DeadlineGroup } from "../types";

/**
 * The right rail: what the platform thinks you should do, what is about to come
 * due, and the five things a manager reaches for most.
 */

/* ------------------------------------------------------ AI recommendations */

const CONFIDENCE_TONE = (score: number): "success" | "high" | "accent" =>
  score >= 85 ? "success" : score >= 70 ? "accent" : "high";

const RecommendationCard = React.memo(function RecommendationCard({
  recommendation,
  applied,
  onApply,
}: {
  recommendation: ActionRecommendation;
  applied: boolean;
  onApply: (id: string) => void;
}) {
  const tone = CONFIDENCE_TONE(recommendation.confidence.score);

  return (
    <li className="rounded-md border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
          <Icon name={recommendation.icon} size="sm" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-content">{recommendation.headline}</p>
          <Link
            href={caseHref(recommendation.caseNo)}
            className="font-mono text-2xs text-content-tertiary transition-colors duration-150 hover:text-accent"
          >
            {recommendation.caseNo}
          </Link>
        </div>
      </div>

      <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
        Suggested
      </p>
      <p className="mt-1 text-xs leading-relaxed text-content-secondary">
        {recommendation.suggestion}
      </p>

      <div className="mt-2.5">
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-2xs font-medium text-content-tertiary underline decoration-dotted underline-offset-2">
                Confidence
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              <p className="text-xs font-medium">Why this score</p>
              <ul className="mt-1 space-y-0.5">
                {recommendation.confidence.drivers.length === 0 ? (
                  <li className="text-2xs opacity-80">
                    Baseline only — no corroborating signal on this case yet.
                  </li>
                ) : (
                  recommendation.confidence.drivers.map((driver) => (
                    <li key={driver.label} className="text-2xs opacity-80">
                      +{driver.points} · {driver.label}
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-1.5 border-t border-line-inverse pt-1 text-2xs opacity-70">
                Scored by a deterministic rule set, never by a model.
              </p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs font-semibold tabular-nums text-content">
            {recommendation.confidence.score}%
          </span>
        </div>
        <ProgressBar
          value={recommendation.confidence.score}
          tone={tone}
          className="mt-1.5"
        />
      </div>

      <Button
        variant={applied ? "subtle" : "primary"}
        size="sm"
        className="mt-3 w-full"
        disabled={applied}
        onClick={() => onApply(recommendation.id)}
      >
        <Icon name={applied ? "Check" : "Sparkles"} size="sm" />
        {applied ? "Recommendation applied" : "Apply recommendation"}
      </Button>
    </li>
  );
});

export function RecommendationsPanel({
  recommendations,
  appliedIds,
  onApply,
}: {
  recommendations: ActionRecommendation[];
  appliedIds: Set<string>;
  onApply: (id: string) => void;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? recommendations : recommendations.slice(0, 3);

  return (
    <SectionCard
      title="AI recommended actions"
      subtitle="Highest confidence first, weighted by what is at stake"
      icon="Sparkles"
      className="h-full"
      {...(recommendations.length > 3
        ? {
            action: (
              <Button variant="ghost" size="xs" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show top 3" : `Show all ${recommendations.length}`}
              </Button>
            ),
          }
        : {})}
    >
      {recommendations.length === 0 ? (
        <EmptyState
          icon="Sparkles"
          title="Nothing to recommend"
          description="Every open case already has a corrective plan in flight."
          size="sm"
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              applied={appliedIds.has(recommendation.id)}
              onApply={onApply}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* --------------------------------------------------- Upcoming deadlines */

const BUCKET_TONE: Record<DeadlineGroup["tone"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  neutral: "bg-content-tertiary",
};

export function DeadlinesPanel({
  groups,
  onOpen,
}: {
  groups: DeadlineGroup[];
  onOpen: (id: string) => void;
}) {
  return (
    <SectionCard
      title="Upcoming deadlines"
      subtitle="Open actions by when they fall due"
      icon="CalendarSync"
      className="h-full"
    >
      {groups.length === 0 ? (
        <EmptyState
          icon="CalendarSync"
          title="No open deadlines"
          description="Nothing is scheduled against an open action right now."
          size="sm"
        />
      ) : (
        <ol className="space-y-3.5">
          {groups.map((group) => (
            <li key={group.bucket}>
              <div className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", BUCKET_TONE[group.tone])} />
                <span className="text-2xs font-semibold uppercase tracking-wide text-content-secondary">
                  {group.label}
                </span>
                <span className="text-2xs tabular-nums text-content-tertiary">
                  {group.actions.length}
                </span>
              </div>

              <ul className="mt-1.5 space-y-1 border-l border-line pl-3.5">
                {group.actions.slice(0, 4).map((action) => (
                  <li key={action.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(action.id)}
                      className="flex w-full min-w-0 items-baseline gap-2 rounded-sm px-1 py-0.5 text-left transition-colors duration-150 hover:bg-surface-hover"
                    >
                      <span className="min-w-0 flex-1 truncate text-2xs text-content">
                        {action.title}
                      </span>
                      <span className="shrink-0 text-2xs tabular-nums text-content-tertiary">
                        {formatDue(action.dueAt, DEMO_NOW)}
                      </span>
                    </button>
                  </li>
                ))}
                {group.actions.length > 4 ? (
                  <li className="px-1 text-2xs text-content-tertiary">
                    +{group.actions.length - 4} more
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------ Quick actions */

export interface QuickActionsPanelProps {
  selectedCount: number;
  onCreate: () => void;
  onAssign: () => void;
  onEscalate: () => void;
  onClose: () => void;
  onReport: () => void;
}

export function QuickActionsPanel({
  selectedCount,
  onCreate,
  onAssign,
  onEscalate,
  onClose,
  onReport,
}: QuickActionsPanelProps) {
  const needsSelection = selectedCount === 0;

  const items = [
    { key: "create", label: "Create action", icon: "Plus", onClick: onCreate, disabled: false },
    {
      key: "assign",
      label: "Assign user",
      icon: "UserCog",
      onClick: onAssign,
      disabled: needsSelection,
    },
    {
      key: "escalate",
      label: "Escalate",
      icon: "TriangleAlert",
      onClick: onEscalate,
      disabled: needsSelection,
    },
    {
      key: "close",
      label: "Close",
      icon: "CircleCheck",
      onClick: onClose,
      disabled: needsSelection,
    },
    { key: "report", label: "Generate report", icon: "FileText", onClick: onReport, disabled: false },
  ];

  return (
    <SectionCard
      title="Quick actions"
      subtitle={
        needsSelection
          ? "Select actions in the queue to enable bulk operations"
          : `${selectedCount} action${selectedCount === 1 ? "" : "s"} selected`
      }
      icon="Zap"
      className="h-full"
    >
      <div className="grid gap-1.5">
        {items.map((item) => (
          <Button
            key={item.key}
            variant="secondary"
            size="md"
            className="justify-start"
            disabled={item.disabled}
            onClick={item.onClick}
          >
            <Icon name={item.icon} size="sm" />
            {item.label}
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------- Bulk bar */

export function BulkActionBar({
  rows,
  onComplete,
  onEscalate,
  onClear,
  children,
}: {
  rows: ActionRow[];
  onComplete: () => void;
  onEscalate: () => void;
  onClear: () => void;
  /** The assign menu, supplied by the parent so it can own the user list. */
  children: React.ReactNode;
}) {
  if (rows.length === 0) return null;

  const openCount = rows.filter((row) => row.isOpen).length;
  const exposure = [...new Set(rows.map((row) => row.caseNo))].length;

  return (
    <div className="anim-settle flex flex-wrap items-center gap-2 rounded-md border border-accent-line bg-accent-subtle px-3 py-2">
      <span className="text-xs font-medium text-accent-content">
        {rows.length} selected
      </span>
      <span className="text-2xs text-content-secondary">
        across {exposure} case{exposure === 1 ? "" : "s"} · {openCount} still open
      </span>

      <span className="ml-auto flex flex-wrap items-center gap-1.5">
        {children}
        <Button variant="secondary" size="sm" onClick={onEscalate}>
          <Icon name="TriangleAlert" size="sm" />
          Escalate
        </Button>
        <Button variant="primary" size="sm" onClick={onComplete} disabled={openCount === 0}>
          <Icon name="CircleCheck" size="sm" />
          Complete
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          <Icon name="X" size="sm" />
        </Button>
      </span>
    </div>
  );
}

/** Compact exposure summary shown under the queue header. */
export function QueueSummary({ rows }: { rows: ActionRow[] }) {
  const exposure = rows.reduce((sum, row) => sum + row.context.revenueAtRisk, 0);
  const cases = new Set(rows.map((row) => row.caseNo)).size;

  return (
    <span className="text-2xs text-content-tertiary">
      {cases} case{cases === 1 ? "" : "s"} · {formatMoney(exposure)} at risk behind these actions
    </span>
  );
}

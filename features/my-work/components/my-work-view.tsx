"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { PageHeader } from "@/components/patterns/page-header";
import { useTranslation } from "@/src/i18n/provider";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { ProgressBar } from "@/components/patterns/progress-bar";
import { SectionCard } from "@/components/patterns/section-card";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { ACTION_STATUS_META, EXCEPTION_META } from "@/src/config/app-config";
import type { MyWorkData } from "@/src/data/queries/my-work";
import { isOpenStatus } from "@/src/domain/case-status";
import type { CaseListItem, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue, formatHours, formatNumber, formatTimestamp } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";
import { useExecutionStore } from "@/src/workflow/execution-store";
import { projectCaseFacts } from "@/src/workflow/projections";

interface MyWorkViewProps {
  data: MyWorkData;
  sessionUser: User;
}

const HOUR_MS = 3_600_000;

/**
 * The owner's view of the same queue.
 *
 * Reads from the shared execution store rather than its own copy, so a case
 * assigned to you on the Work Manager appears here immediately, and one you
 * verify on the case page leaves — without a reload. Everything on this page is
 * derived; nothing is stored twice.
 */
export function MyWorkView({ data, sessionUser }: MyWorkViewProps) {
  const { t } = useTranslation();
  const { state } = useExecutionStore();

  const projected = React.useMemo(
    () => projectCaseFacts(data.cases, state),
    [data.cases, state],
  );

  const mine = React.useMemo(
    () => projected.filter((item) => item.ownerId === sessionUser.id),
    [projected, sessionUser.id],
  );

  const { open, awaitingReview, closed } = React.useMemo(() => {
    const openCases: CaseListItem[] = [];
    const review: CaseListItem[] = [];
    const done: CaseListItem[] = [];
    for (const item of mine) {
      if (!isOpenStatus(item.status)) done.push(item);
      else if (item.status === "PENDING_VERIFY") review.push(item);
      else openCases.push(item);
    }
    return { open: openCases, awaitingReview: review, closed: done };
  }, [mine]);

  const exposure = React.useMemo(
    () => open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    [open],
  );

  const overdue = React.useMemo(
    () =>
      open.filter((item) => new Date(item.dueAt).getTime() < DEMO_NOW.getTime()).length,
    [open],
  );

  /** Cases where I am the named reviewer and the owner is waiting on me. */
  const toReview = React.useMemo(
    () =>
      projected.filter((item) => {
        const override = state.overrides[item.caseNo];
        const reviewerId = override?.reviewerId;
        return (
          item.status === "PENDING_VERIFY" &&
          item.ownerId !== sessionUser.id &&
          reviewerId === sessionUser.id
        );
      }),
    [projected, state.overrides, sessionUser.id],
  );

  const openActions = data.actions.filter((action) => action.status !== "DONE");

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("page.myWork.title")}
        description={t("page.myWork.description")}
        docKey="my-work"
        meta={
          <>
            <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <Icon name="Clock" size="xs" />
              Data as at {formatTimestamp(DEMO_NOW)} UTC
            </span>
            <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <Icon name="UserCog" size="xs" />
              {sessionUser.name} · {sessionUser.jobTitle}
            </span>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t("mw.openCases")}
          icon="Rows3"
          value={formatNumber(open.length)}
          footnote={
            overdue > 0
              ? `${overdue} past SLA`
              : open.length === 0
                ? "Nothing on your desk"
                : "All within SLA"
          }
          tone={overdue > 0 ? "critical" : "neutral"}
        />
        <StatTile
          label={t("case.revenueAtRisk")}
          icon="DollarSign"
          value={<MoneyCell amount={exposure} compact={false} className="text-2xl font-semibold" />}
          footnote="Across the cases you own"
          tone="neutral"
        />
        <StatTile
          label={t("mw.awaitingReview")}
          icon="ShieldCheck"
          value={formatNumber(toReview.length)}
          footnote={
            toReview.length > 0 ? "Owners are blocked on you" : "Nothing waiting on you"
          }
          tone={toReview.length > 0 ? "verify" : "neutral"}
        />
        <StatTile
          label={t("mw.portfolioResolution")}
          icon="Gauge"
          value={formatHours(data.portfolioMttrHours)}
          footnote="Mean time to resolve this quarter"
          tone="neutral"
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <CaseList
            title={t("myWork.casesYouOwn")}
            subtitle={`${open.length} open · worked in priority order`}
            icon="Rows3"
            cases={open}
            emptyTitle="Nothing assigned to you"
            emptyDescription="Cases appear here the moment a manager routes one to you in the Work Manager."
          />

          {awaitingReview.length > 0 ? (
            <CaseList
              title={t("myWork.submitted")}
              subtitle={`${awaitingReview.length} waiting on a reviewer`}
              icon="ShieldCheck"
              cases={awaitingReview}
              emptyTitle=""
              emptyDescription=""
            />
          ) : null}

          {closed.length > 0 ? (
            <CaseList
              title={t("myWork.closedThisSession")}
              subtitle={`${closed.length} verified or closed`}
              icon="CircleCheck"
              cases={closed}
              emptyTitle=""
              emptyDescription=""
            />
          ) : null}
        </div>

        <aside className="min-w-0 xl:col-span-4">
          <div className="grid gap-4 xl:sticky xl:top-[calc(var(--spacing-topbar)+1rem)]">
            <SectionCard
              title={t("myWork.awaitingReview")}
              subtitle={`${toReview.length} case${toReview.length === 1 ? "" : "s"}`}
              icon="ShieldCheck"
              flush
            >
              {toReview.length === 0 ? (
                <p className="px-4 py-3.5 text-xs leading-relaxed text-content-tertiary">
                  Nothing is waiting on your sign-off. Cases arrive here when an owner
                  submits work and names you as reviewer.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {toReview.map((item) => (
                    <li key={item.caseNo}>
                      <Link
                        href={caseHref(item.caseNo)}
                        className="group flex flex-col gap-1.5 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-subtle"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-2xs text-content-tertiary">
                            {item.caseNo}
                          </span>
                          <StatusBadge status={item.status} size="sm" showDot={false} />
                        </span>
                        <span className="line-clamp-2 text-xs font-medium leading-snug text-content transition-colors duration-150 group-hover:text-accent">
                          {item.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title={t("myWork.todaysActions")}
              subtitle={`${openActions.length} open`}
              icon="ListChecks"
              flush
            >
              {openActions.length === 0 ? (
                <p className="px-4 py-3.5 text-xs leading-relaxed text-content-tertiary">
                  No corrective actions are seeded against you. Actions created on a case
                  are worked from the case itself.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {openActions.map((action) => (
                    <li key={action.id} className="px-4 py-2.5">
                      <Link
                        href={caseHref(action.caseNo)}
                        className="group block text-xs font-medium leading-snug text-content transition-colors duration-150 hover:text-accent"
                      >
                        {action.title}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-content-tertiary">
                        <span className="font-mono">{action.caseNo}</span>
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            new Date(action.dueAt).getTime() < DEMO_NOW.getTime()
                              ? "font-medium text-critical"
                              : "",
                          )}
                        >
                          <Icon name="CalendarClock" size="xs" />
                          {formatDue(action.dueAt, DEMO_NOW)}
                        </span>
                        <span
                          className={cn(
                            "rounded-sm border px-1 py-px font-medium",
                            ACTION_STATUS_META[action.status].className,
                          )}
                        >
                          {t(`actionStatus.${action.status}`)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title={t("myWork.queue")} icon="Rows3" flush>
              <div className="px-4 py-3.5">
                <Button variant="secondary" size="md" asChild className="w-full justify-start">
                  <Link href="/work?mine=true">
                    <Icon name="Filter" size="sm" />
                    {t("mw.openInWorkManager")}
                  </Link>
                </Button>
              </div>
            </SectionCard>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  label,
  icon,
  value,
  footnote,
  tone,
}: {
  label: string;
  icon: string;
  value: React.ReactNode;
  footnote: string;
  tone: "neutral" | "critical" | "verify";
}) {
  const iconTone = {
    neutral: "bg-surface-hover text-content-secondary",
    critical: "bg-critical-subtle text-critical",
    verify: "bg-status-verify-subtle text-status-verify",
  }[tone];

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-line bg-surface px-3.5 py-3">
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            iconTone,
          )}
        >
          <Icon name={icon} size="sm" />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-content-secondary">
          {label}
        </span>
      </span>
      <span className="anim-status mt-2 text-2xl font-semibold leading-none tracking-tight text-content tabular-nums">
        {value}
      </span>
      <span className="mt-1.5 truncate text-2xs text-content-tertiary">{footnote}</span>
    </div>
  );
}

const CaseList = React.memo(function CaseList({
  title,
  subtitle,
  icon,
  cases,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  icon: string;
  cases: CaseListItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <SectionCard title={title} subtitle={subtitle} icon={icon} flush>
      {cases.length === 0 ? (
        <EmptyState
          icon="CircleCheck"
          title={emptyTitle}
          description={emptyDescription}
          size="sm"
        />
      ) : (
        <ul className="divide-y divide-line">
          {cases.map((item) => {
            const exception = EXCEPTION_META[item.exceptionType];
            const hoursToDue =
              (new Date(item.dueAt).getTime() - DEMO_NOW.getTime()) / HOUR_MS;
            const breached = isOpenStatus(item.status) && hoursToDue < 0;

            return (
              <li key={item.caseNo}>
                <Link
                  href={caseHref(item.caseNo)}
                  className="group flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-subtle"
                >
                  <span
                    className={cn(
                      "mt-1 h-8 w-[3px] shrink-0 rounded-full",
                      breached ? "bg-critical" : "bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-2xs text-content-tertiary">
                        {item.caseNo}
                      </span>
                      <PriorityChip band={item.priorityBand} size="sm" />
                      <StatusBadge status={item.status} size="sm" />
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-content transition-colors duration-150 group-hover:text-accent">
                      {item.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-content-tertiary">
                      <span className="flex items-center gap-1">
                        <Icon name={exception.icon} size="xs" />
                        {exception.label}
                      </span>
                      <span className="font-mono">{item.plantCode}</span>
                      <span
                        className={cn(breached ? "font-medium text-critical" : "")}
                      >
                        {formatDue(item.dueAt, DEMO_NOW)}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <MoneyCell
                      amount={item.revenueAtRisk}
                      compact={false}
                      emphasis={item.priorityBand === "CRITICAL" ? "risk" : "strong"}
                      className="text-xs"
                    />
                    <ProgressBar
                      value={Math.max(
                        0,
                        Math.min(100, ((720 - Math.max(hoursToDue, 0)) / 720) * 100),
                      )}
                      tone={breached ? "critical" : "accent"}
                      className="mt-2 w-24"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
});

"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { roleLabel } from "@/src/domain/labels";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DETECTION_SOURCE_META, EXCEPTION_META } from "@/src/config/app-config";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { CaseSessionState, PendingCommand } from "../types";
import { computeSla } from "../utils/sla";
import { CommandSpinner, ProgressBar } from "./primitives";

interface CaseHeaderProps {
  detail: CaseDetailModel;
  session: CaseSessionState;
  owner: User | null;
  reviewer: User;
  onAssign: (userId: string) => void;
  onStartWork: () => void;
  onUploadEvidence: () => void;
  onRequestVerification: () => void;
  onExport: () => void;
  onOpenCopilot: () => void;
  pending: PendingCommand;
}

function HeaderFact({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-content-tertiary">
        <Icon name={icon} size="xs" />
        {label}
      </p>
      <div className="mt-1 truncate text-xs font-medium text-content">{children}</div>
    </div>
  );
}

/**
 * Everything a manager needs to orient in one glance, and the five commands
 * that move the case. The identity row never scrolls out of reach on desktop:
 * the case number and status stay pinned while the sections below scroll.
 */
export const CaseHeader = React.memo(function CaseHeader({
  detail,
  session,
  owner,
  reviewer,
  onAssign,
  onStartWork,
  onUploadEvidence,
  onRequestVerification,
  onExport,
  onOpenCopilot,
  pending,
}: CaseHeaderProps) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  const item = detail.case;
  const exception = EXCEPTION_META[item.exceptionType];
  const detection = DETECTION_SOURCE_META[item.detectedBy];
  const sla = computeSla(session.dueAt, session.status, session.priorityBand, DEMO_NOW);
  const lastUpdated = session.timeline[session.timeline.length - 1]?.at ?? item.openedAt;

  const terminal = session.status === "VERIFIED" || session.status === "CLOSED";
  const canStart =
    session.status !== "IN_PROGRESS" && session.ownerId !== null && !terminal;
  const openActions = session.actions.filter((action) => action.status !== "DONE").length;
  const canRequestVerification =
    session.actions.length > 0 &&
    openActions === 0 &&
    session.status !== "PENDING_VERIFY" &&
    session.status !== "VERIFIED" &&
    session.status !== "CLOSED";

  return (
    <header
      className={cn(
        "anim-status overflow-hidden rounded-lg border bg-surface",
        terminal ? "border-success-line" : "border-line",
      )}
    >
      {terminal ? (
        <div className="anim-settle flex items-center gap-2 border-b border-success-line bg-success-subtle px-4 py-2">
          <Icon name="CircleCheck" size="sm" className="shrink-0 text-success" />
          <p className="text-xs font-medium text-success-content">
            Outcome verified against the {detail.case.measurementWindowDays}-day measurement
            window. The SLA clock has stopped and the case is read-only.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/work"
              className="flex items-center gap-1 rounded-sm text-2xs font-medium text-content-tertiary transition-colors duration-150 hover:text-accent"
            >
              <Icon name="ArrowLeft" size="xs" />
              {t("nav.work")}
            </Link>
            <span className="text-content-tertiary">·</span>
            <span className="font-mono text-2xs text-content-secondary">{item.caseNo}</span>
            {session.changeCount > 0 ? (
              <span className="rounded-sm border border-high-line bg-high-subtle px-1.5 py-px text-2xs font-medium text-high-content">
                {session.changeCount} unsaved change{session.changeCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <h1 className="mt-1.5 text-xl font-semibold leading-snug tracking-[-0.014em] text-content">
            {item.title}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <PriorityChip
              band={session.priorityBand}
              score={item.priorityScore}
              factors={item.priorityFactors}
            />
            <StatusBadge status={session.status} />
            <span className="flex items-center gap-1.5 rounded-sm border border-line bg-surface-subtle px-2 py-0.5 text-xs text-content-secondary">
              <Icon name={exception.icon} size="xs" className="text-content-tertiary" />
              {exception.label}
            </span>
            <span className="flex items-center gap-1.5 rounded-sm border border-line bg-surface-subtle px-2 py-0.5 text-xs text-content-secondary">
              <Icon name="Factory" size="xs" className="text-content-tertiary" />
              {item.plantCode} · {item.plant.name}
            </span>
            <span
              title={detection.description}
              className="flex items-center gap-1.5 rounded-sm border border-line bg-surface-subtle px-2 py-0.5 text-xs text-content-secondary"
            >
              <Icon name={detection.icon} size="xs" className="text-content-tertiary" />
              {detection.label}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" disabled={pending !== null || terminal}>
                {pending === "assign" ? (
                  <CommandSpinner />
                ) : (
                  <Icon name="UserPlus" size="sm" />
                )}
                {pending === "assign" ? "Assigning" : owner ? "Reassign" : "Assign owner"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64">
              <DropdownMenuLabel>{t("action.assignOwner")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {detail.assignableUsers.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onSelect={() => onAssign(user.id)}
                  className="items-start gap-2.5 py-2"
                >
                  <OwnerAvatar user={user} size="sm" showName={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-content">
                      {user.name}
                    </span>
                    <span className="block truncate text-2xs text-content-tertiary">
                      {roleLabel(user.role, labels)} · {user.plantScope.join(", ")}
                    </span>
                  </span>
                  {user.id === session.ownerId ? (
                    <Icon name="Check" size="sm" className="mt-0.5 text-accent" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="secondary"
            size="sm"
            onClick={onStartWork}
            disabled={!canStart || pending !== null}
            title={
              session.ownerId === null
                ? "Assign an owner before starting work"
                : session.status === "IN_PROGRESS"
                  ? "Work is already in progress"
                  : "Move the case to in progress"
            }
          >
            {pending === "start" ? <CommandSpinner /> : <Icon name="Play" size="sm" />}
            {pending === "start" ? "Starting" : "Start work"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onUploadEvidence}
            disabled={pending !== null || terminal}
          >
            {pending === "evidence" ? <CommandSpinner /> : <Icon name="Upload" size="sm" />}
            {pending === "evidence" ? "Attaching" : "Upload evidence"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRequestVerification}
            disabled={!canRequestVerification || pending !== null}
            title={
              session.actions.length === 0
                ? "Add corrective actions before requesting verification"
                : openActions > 0
                  ? `${openActions} action${openActions === 1 ? "" : "s"} still open`
                  : "Send to the reviewer for sign-off"
            }
          >
            {pending === "request-verification" ? (
              <CommandSpinner />
            ) : (
              <Icon name="ShieldCheck" size="sm" />
            )}
            {pending === "request-verification" ? "Submitting" : "Request verification"}
          </Button>

          <Button variant="secondary" size="sm" onClick={onExport}>
            <Icon name="Download" size="sm" />
            {t("common.export")}
          </Button>

          <Button variant="primary" size="sm" onClick={onOpenCopilot}>
            <Icon name="Sparkles" size="sm" />
            {t("cd.askCopilot")}
          </Button>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <HeaderFact label={t("case.owner")} icon="UserCog">
          {owner ? (
            <span className="flex items-center gap-1.5">
              <OwnerAvatar user={owner} size="sm" showName={false} />
              <span className="truncate">{owner.name}</span>
            </span>
          ) : (
            <span className="text-high-content">{t("cd.unassigned")}</span>
          )}
        </HeaderFact>

        <HeaderFact label={t("case.reviewer")} icon="ShieldCheck">
          <span className="flex items-center gap-1.5">
            <OwnerAvatar user={reviewer} size="sm" showName={false} />
            <span className="truncate">{reviewer.name}</span>
          </span>
        </HeaderFact>

        <HeaderFact label={t("case.revenueAtRisk")} icon="DollarSign">
          <MoneyCell
            amount={item.revenueAtRisk}
            currency={item.currency}
            compact={false}
            emphasis={session.priorityBand === "CRITICAL" ? "risk" : "strong"}
            className="text-xs"
          />
        </HeaderFact>

        <HeaderFact label={t("cd.slaRemaining")} icon="CalendarClock">
          <span
            className={cn(
              "block",
              sla.breached
                ? "text-critical"
                : sla.atRisk
                  ? "text-high-content"
                  : "text-content",
            )}
          >
            {sla.label}
          </span>
          <ProgressBar
            value={sla.consumedPct}
            tone={sla.stopped ? "success" : sla.breached ? "critical" : sla.atRisk ? "high" : "accent"}
            className="mt-1.5"
          />
        </HeaderFact>

        <HeaderFact label={t("cd.created")} icon="Clock">
          <span title={formatTimestamp(item.openedAt)}>
            {formatWhen(item.openedAt, DEMO_NOW, fmt)}
          </span>
        </HeaderFact>

        <HeaderFact label={t("cd.lastUpdated")} icon="History">
          <span title={formatTimestamp(lastUpdated)}>
            {formatWhen(lastUpdated, DEMO_NOW, fmt)}
          </span>
        </HeaderFact>
      </div>
    </header>
  );
});

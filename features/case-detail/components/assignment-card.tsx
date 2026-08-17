"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { caseStatusLabel, priorityLabel, roleLabel } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { CASE_STATUSES, PRIORITY_BANDS } from "@/src/domain/types";
import type { CaseStatus, PriorityBand, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import type { CaseSessionState } from "../types";
import { fromDateTimeInputValue, toDateTimeInputValue } from "../utils/datetime";
import { computeSla } from "../utils/sla";
import { FIELD_CLASS } from "./primitives";

interface AssignmentCardProps {
  session: CaseSessionState;
  owner: User | null;
  reviewer: User;
  users: User[];
  scoredBand: PriorityBand;
  onAssignOwner: (userId: string | null) => void;
  onSetReviewer: (userId: string) => void;
  onSetDueAt: (iso: string) => void;
  onSetPriority: (band: PriorityBand) => void;
  onSetStatus: (status: CaseStatus) => void;
  onAddNote: (body: string) => void;
}

/** Statuses a person may set by hand. Verification outcomes are not among them. */
const MANUAL_STATUSES: CaseStatus[] = CASE_STATUSES.filter(
  (status) => status !== "VERIFIED" && status !== "CLOSED",
);

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
    >
      {children}
    </label>
  );
}

/**
 * The only section on the page where the case itself is edited. Every control
 * writes through the session reducer, so each change lands on the timeline and
 * in the audit log with the actor attached.
 */
export const AssignmentCard = React.memo(function AssignmentCard({
  session,
  owner,
  reviewer,
  users,
  scoredBand,
  onAssignOwner,
  onSetReviewer,
  onSetDueAt,
  onSetPriority,
  onSetStatus,
  onAddNote,
}: AssignmentCardProps) {
  const labels = useLabels();
  const { t } = useTranslation();
  const [note, setNote] = React.useState("");
  const sla = computeSla(session.dueAt, session.status, session.priorityBand, DEMO_NOW);

  const submitNote = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = note.trim();
    if (trimmed === "") return;
    onAddNote(trimmed);
    setNote("");
  };

  return (
    <SectionCard
      title={t("section.assignment")}
      subtitle={t("cd.assignmentSub")}
      icon="UserCog"
      flush
      footer={
        <p className="flex items-center gap-1.5 text-2xs text-content-tertiary">
          <Icon name="ScrollText" size="xs" />
          {t("cd.auditNotice")}
        </p>
      }
    >
      <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-2">
        <div className="min-w-0">
          <Label htmlFor="assign-owner">{t("case.owner")}</Label>
          <select
            id="assign-owner"
            value={session.ownerId ?? ""}
            onChange={(event) => onAssignOwner(event.target.value === "" ? null : event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">{t("cd.unassigned")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} — {roleLabel(user.role, labels)}
              </option>
            ))}
          </select>
          {owner ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-content-tertiary">
              <OwnerAvatar user={owner} size="sm" showName={false} />
              {owner.jobTitle} · scope {owner.plantScope.join(", ")}
            </p>
          ) : (
            <p className="mt-1.5 text-2xs font-medium text-high-content">
              {t("cd.nobodyAccountable")}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <Label htmlFor="assign-reviewer">{t("case.reviewer")}</Label>
          <select
            id="assign-reviewer"
            value={session.reviewerId}
            onChange={(event) => onSetReviewer(event.target.value)}
            className={FIELD_CLASS}
          >
            {users
              .filter((user) => user.id !== session.ownerId)
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {roleLabel(user.role, labels)}
                </option>
              ))}
          </select>
          <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="ShieldCheck" size="xs" />
            {reviewer.jobTitle} signs off the outcome. The owner cannot verify their own work.
          </p>
        </div>

        <div className="min-w-0">
          <Label htmlFor="assign-due">{t("cd.dueDateUtc")}</Label>
          <input
            id="assign-due"
            type="datetime-local"
            value={toDateTimeInputValue(session.dueAt)}
            onChange={(event) => {
              const iso = fromDateTimeInputValue(event.target.value);
              if (iso) onSetDueAt(iso);
            }}
            className={cn(FIELD_CLASS, "tabular-nums")}
          />
          <p
            className={cn(
              "mt-1.5 text-2xs",
              sla.breached
                ? "font-medium text-critical"
                : sla.atRisk
                  ? "font-medium text-high-content"
                  : "text-content-tertiary",
            )}
          >
            {sla.label} · {sla.targetHours}h target for the {priorityLabel(session.priorityBand, labels).toLowerCase()} band
          </p>
        </div>

        <div className="min-w-0">
          <Label htmlFor="assign-priority">{t("case.priority")}</Label>
          <select
            id="assign-priority"
            value={session.priorityBand}
            onChange={(event) => onSetPriority(event.target.value as PriorityBand)}
            className={FIELD_CLASS}
          >
            {PRIORITY_BANDS.map((band) => (
              <option key={band} value={band}>
                {priorityLabel(band, labels)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-2xs text-content-tertiary">
            {session.priorityBand === scoredBand ? (
              <>{t("cd.priorityHint")}</>
            ) : (
              <span className="font-medium text-high-content">
                Overridden — the rule set scored this {priorityLabel(scoredBand, labels).toLowerCase()}.
              </span>
            )}
          </p>
        </div>

        <div className="min-w-0 sm:col-span-2">
          <Label htmlFor="assign-status">{t("case.status")}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="assign-status"
              value={session.status}
              onChange={(event) => onSetStatus(event.target.value as CaseStatus)}
              disabled={session.status === "VERIFIED" || session.status === "CLOSED"}
              className={cn(FIELD_CLASS, "sm:max-w-xs disabled:opacity-60")}
            >
              {(MANUAL_STATUSES.includes(session.status)
                ? MANUAL_STATUSES
                : [...MANUAL_STATUSES, session.status]
              ).map((status) => (
                <option key={status} value={status}>
                  {caseStatusLabel(status, labels)}
                </option>
              ))}
            </select>
            {session.status === "VERIFIED" || session.status === "CLOSED" ? (
              <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
                <Icon name="Lock" size="xs" />
                {t("cd.statusHint")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <form onSubmit={submitNote} className="border-t border-line px-4 py-3.5">
        <Label htmlFor="assign-note">{t("cd.assignmentNote")}</Label>
        <textarea
          id="assign-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder={t("cd.assignmentNoteHint")}
          className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-2xs text-content-tertiary">
            {t("cd.assignmentNotePosted")}
          </p>
          <Button variant="secondary" size="sm" type="submit" disabled={note.trim() === ""}>
            <Icon name="Send" size="sm" />
            {t("cd.addNote")}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
});

"use client";

import { KPI_LABEL } from "@/src/config/app-config";
import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import type { CorrectiveAction, User, VerificationDecision } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { CaseSessionState, PendingCommand, VerificationDraft } from "../types";
import { CommandSpinner, FIELD_CLASS, ProgressBar } from "./primitives";

interface VerificationCardProps {
  session: CaseSessionState;
  reviewer: User;
  sessionUser: User;
  actions: CorrectiveAction[];
  evidenceCount: number;
  pending: PendingCommand;
  onRequest: () => void;
  onDecide: (draft: VerificationDraft) => void;
}

const DECISIONS: {
  value: VerificationDecision;
  label: string;
  detail: string;
  icon: string;
  className: string;
  activeClassName: string;
}[] = [
  {
    value: "APPROVED",
    label: "Approve",
    detail: "The outcome holds against the measurement window. The case is verified.",
    icon: "CircleCheck",
    className: "border-line hover:border-success-line hover:bg-success-subtle",
    activeClassName: "border-success bg-success-subtle text-success-content",
  },
  {
    value: "SENT_BACK",
    label: "Send back",
    detail: "The work is sound but the evidence is incomplete. Returns to the owner.",
    icon: "Undo2",
    className: "border-line hover:border-high-line hover:bg-high-subtle",
    activeClassName: "border-high bg-high-subtle text-high-content",
  },
  {
    value: "REJECTED",
    label: "Reject",
    detail: "The corrective action did not resolve the condition. Returns to the owner.",
    icon: "CircleX",
    className: "border-line hover:border-critical-line hover:bg-critical-subtle",
    activeClassName: "border-critical bg-critical-subtle text-critical-content",
  },
];

/**
 * The control that makes the rest of the platform mean anything: a second
 * person confirms the KPI actually moved before a case can be called closed.
 *
 * Three rules are enforced here rather than trusted to convention — the owner
 * cannot verify their own work, a decision cannot be recorded without a written
 * justification, and approval writes the KPI reading against the measurement
 * window so the outcome is auditable months later.
 */
export const VerificationCard = React.memo(function VerificationCard({
  session,
  reviewer,
  sessionUser,
  actions,
  evidenceCount,
  pending,
  onRequest,
  onDecide,
}: VerificationCardProps) {
  const [decision, setDecision] = React.useState<VerificationDecision | null>(null);
  const [comment, setComment] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const verification = session.verification;
  const open = actions.filter((action) => action.status !== "DONE");
  const done = actions.length - open.length;
  const isReviewer = sessionUser.id === session.reviewerId;
  const isOwner = sessionUser.id === session.ownerId;
  const decided = verification?.decision != null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!decision) {
      setError("Choose an outcome.");
      return;
    }
    if (comment.trim().length < 12) {
      setError("A decision needs a written justification the owner can act on.");
      return;
    }
    setError(null);
    onDecide({ decision, comment: comment.trim(), notes: notes.trim() });
    setDecision(null);
    setComment("");
    setNotes("");
  };

  /* ------------------------------------------------ Not yet submitted */

  if (!verification) {
    const ready = actions.length > 0 && open.length === 0;

    return (
      <SectionCard
        title="Verification"
        subtitle="Second-person sign-off against the measurement window"
        icon="ShieldCheck"
        flush
      >
        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-subtle px-3.5 py-3">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                ready
                  ? "border-success-line bg-success-subtle text-success"
                  : "border-line bg-surface text-content-tertiary",
              )}
            >
              <Icon name={ready ? "CircleCheck" : "Clock"} size="md" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-content">
                {ready
                  ? "Ready for verification"
                  : `${open.length} action${open.length === 1 ? "" : "s"} still open`}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                {ready
                  ? `All ${actions.length} corrective actions are complete with ${evidenceCount} evidence file${
                      evidenceCount === 1 ? "" : "s"
                    } attached. Sending this to ${reviewer.name} starts the ${
                      session.verification?.measurementWindowDays ?? 14
                    }-day sign-off against the target KPI.`
                  : actions.length === 0
                    ? "Add corrective actions and evidence before requesting sign-off. A verification with nothing behind it is worse than none."
                    : `Close the remaining work first — ${done} of ${actions.length} actions are complete.`}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-2xs text-content-tertiary">
              <OwnerAvatar user={reviewer} size="sm" showName={false} />
              {reviewer.name} will review · {reviewer.jobTitle}
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={onRequest}
              disabled={!ready || pending !== null}
            >
              {pending === "request-verification" ? (
                <CommandSpinner />
              ) : (
                <Icon name="ShieldCheck" size="sm" />
              )}
              {pending === "request-verification" ? "Submitting" : "Request verification"}
            </Button>
          </div>
        </div>
      </SectionCard>
    );
  }

  /* ------------------------------------------------------ Submitted */

  const kpiMovement =
    verification.kpiCurrent !== null
      ? ((verification.kpiCurrent - verification.kpiBaseline) /
          Math.max(Math.abs(verification.kpiTarget - verification.kpiBaseline), 0.01)) *
        100
      : 0;

  return (
    <SectionCard
      title="Verification"
      subtitle={
        decided
          ? `${verification.decision === "APPROVED" ? "Approved" : "Returned"} by ${verification.reviewerName}`
          : `Awaiting ${verification.reviewerName}`
      }
      icon="ShieldCheck"
      flush
      footer={
        <p className="flex items-center gap-1.5 text-2xs text-content-tertiary">
          <Icon name="Info" size="xs" />
          Measured over {verification.measurementWindowDays} days against{" "}
          {KPI_LABEL[verification.kpiKey] ?? verification.kpiKey}.{" "}
          {decided
            ? "The reading was captured at the decision, not estimated afterwards."
            : "The window is still open, so this is an interim reading. The KPI has moved during the measurement period; whether the corrective action caused the movement is for the reviewer to judge."}
        </p>
      }
    >
      <div className="grid gap-3 border-b border-line px-4 py-3.5 sm:grid-cols-3">
        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
            Requested by
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-content">
            {verification.requestedByName}
          </p>
          <p
            className="mt-0.5 text-2xs text-content-tertiary"
            title={formatTimestamp(verification.requestedAt)}
          >
            {formatWhen(verification.requestedAt, DEMO_NOW)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
            Reviewer
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-content">
            <OwnerAvatar user={reviewer} size="sm" showName={false} />
            {verification.reviewerName}
          </p>
          <p className="mt-0.5 text-2xs text-content-tertiary">
            {decided && verification.decidedAt
              ? `Decided ${formatWhen(verification.decidedAt, DEMO_NOW)}`
              : "Decision pending"}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
            {decided ? "Measured outcome" : "Measurement in progress"}
          </p>
          {/*
            Three numbers, each labelled, because an unlabelled "87 → 92" invites
            the reader to supply the missing word — and the word they supply is
            usually "improved by", which is a causal claim this product does not
            make. Baseline is what was captured before the work; the reading is
            where the KPI sits now; target is what was agreed.
          */}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1 text-xs font-medium tabular-nums text-content">
            <span title="Captured when the case was opened">
              {verification.kpiBaseline}
              <span className="ml-0.5 text-2xs font-normal text-content-tertiary">
                baseline
              </span>
            </span>
            <span className="text-content-tertiary">→</span>
            <span title={decided ? "Reading at the decision" : "Interim reading, window still open"}>
              {verification.kpiCurrent ?? "—"}
              <span className="ml-0.5 text-2xs font-normal text-content-tertiary">
                {decided ? "final" : "interim"}
              </span>
            </span>
            <span className="text-2xs font-normal text-content-tertiary">
              · target {verification.kpiTarget}
            </span>
          </p>
          <ProgressBar
            value={Math.max(0, Math.min(100, kpiMovement))}
            tone={verification.kpiCurrent === null ? "accent" : "success"}
            className="mt-1.5"
          />
        </div>
      </div>

      {decided ? (
        <div className="px-4 py-3.5">
          <div
            className={cn(
              "anim-settle flex items-start gap-3 rounded-lg border px-3.5 py-3",
              verification.decision === "APPROVED"
                ? "border-success-line bg-success-subtle"
                : "border-critical-line bg-critical-subtle",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border bg-surface",
                verification.decision === "APPROVED"
                  ? "border-success-line text-success"
                  : "border-critical-line text-critical",
              )}
            >
              <Icon
                name={verification.decision === "APPROVED" ? "CircleCheck" : "CircleX"}
                size="md"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  verification.decision === "APPROVED"
                    ? "text-success-content"
                    : "text-critical-content",
                )}
              >
                {verification.decision === "APPROVED"
                  ? "Verified"
                  : verification.decision === "REJECTED"
                    ? "Rejected"
                    : "Sent back to the owner"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                {verification.comment}
              </p>
              {verification.notes ? (
                <p className="mt-2 rounded-md border border-line bg-surface px-2.5 py-2 text-2xs leading-relaxed text-content-tertiary">
                  <span className="font-medium text-content-secondary">What was checked. </span>
                  {verification.notes}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : isReviewer ? (
        <form onSubmit={submit} className="px-4 py-3.5">
          <p className="text-2xs font-medium uppercase tracking-wide text-content-tertiary">
            Your decision
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {DECISIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={decision === option.value}
                onClick={() => setDecision(option.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors duration-150",
                  decision === option.value ? option.activeClassName : option.className,
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <Icon name={option.icon} size="sm" />
                  {option.label}
                </span>
                <span className="text-2xs leading-relaxed text-content-tertiary">
                  {option.detail}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="verify-comment"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                Decision comment <span className="text-critical">required</span>
              </label>
              <textarea
                id="verify-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="What you concluded and why. The owner acts on this."
                className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
              />
            </div>
            <div>
              <label
                htmlFor="verify-notes"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                Verification notes
              </label>
              <textarea
                id="verify-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="What you checked — which evidence, which readings, which orders."
                className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-2 flex items-center gap-1.5 text-2xs font-medium text-critical-content">
              <Icon name="CircleAlert" size="xs" />
              {error}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-2xs text-content-tertiary">
              Recorded against {sessionUser.name} at {formatTimestamp(DEMO_NOW)} UTC.
            </span>
            <Button variant="primary" size="md" type="submit" disabled={pending !== null}>
              {pending === "decide" ? <CommandSpinner /> : <Icon name="ShieldCheck" size="sm" />}
              {pending === "decide" ? "Recording" : "Record decision"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3 rounded-lg border border-status-verify-line bg-status-verify-subtle px-3.5 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-status-verify-line bg-surface text-status-verify">
              <Icon name="Clock" size="md" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-content">
                Waiting on {verification.reviewerName}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                {isOwner
                  ? "You submitted this case, so you cannot sign it off. Verification is deliberately a second pair of eyes."
                  : `Only ${verification.reviewerName} can record the decision on this case. Switch persona to review it.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
});

"use client";

import * as React from "react";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { AssignMenu } from "@/components/patterns/assign-menu";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { ProgressBar } from "@/components/patterns/progress-bar";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { AUDIT_SOURCE_LABEL } from "@/src/config/app-config";
import type { ActionDrawerContext, ActionRecommendation } from "@/src/data/queries/actions";
import { ACTION_SLA_META } from "@/src/domain/action-sla";
import type { ActionStatus, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { useFocusTrap } from "@/src/a11y/use-focus-trap";
import { cn } from "@/src/lib/cn";
import { formatDue, formatMoney, formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import type { ActionRow } from "../types";

/**
 * The action detail drawer.
 *
 * Everything a manager needs to decide without leaving the queue: what the case
 * is, who holds it, what has happened, what was said, what was attached, what
 * the platform recommends, and the audit trail. The three controls that change
 * state — status, owner, complete — sit in a sticky footer so they are reachable
 * from any scroll position.
 *
 * `inert` rather than `aria-hidden` while closed: the panel stays mounted so a
 * reopened drawer keeps its scroll position, but its controls must leave the tab
 * order entirely.
 */

const STATUS_OPTIONS: ActionStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

type Tab = "timeline" | "comments" | "attachments" | "audit";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "timeline", label: "Timeline", icon: "Activity" },
  { key: "comments", label: "Comments", icon: "MessageSquare" },
  { key: "attachments", label: "Attachments", icon: "Paperclip" },
  { key: "audit", label: "Audit", icon: "ScrollText" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
        {label}
      </p>
      <div className="mt-0.5 text-xs text-content">{children}</div>
    </div>
  );
}

interface ActionDrawerProps {
  row: ActionRow | null;
  context: ActionDrawerContext | null;
  recommendation: ActionRecommendation | null;
  users: User[];
  sessionUser: User;
  open: boolean;
  onClose: () => void;
  onSetStatus: (id: string, status: ActionStatus) => void;
  onAssign: (ids: string[], userId: string) => void;
  onComplete: (ids: string[]) => void;
  onApplyRecommendation: (id: string) => void;
  recommendationApplied: boolean;
}

export function ActionDrawer({
  row,
  context,
  recommendation,
  users,
  sessionUser,
  open,
  onClose,
  onSetStatus,
  onAssign,
  onComplete,
  onApplyRecommendation,
  recommendationApplied,
}: ActionDrawerProps) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const trapRef = useFocusTrap(open);
  const [tab, setTab] = React.useState<Tab>("timeline");

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Reset to the first tab when a different action is opened, so the drawer
  // never opens on an empty tab from the previous action.
  const actionId = row?.id ?? null;
  React.useEffect(() => {
    setTab("timeline");
  }, [actionId]);

  const sla = row ? ACTION_SLA_META[row.slaState] : null;
  const owner = users.find((user) => user.id === row?.ownerId) ?? null;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t("actionCenter.closeActionDetail")}
          onClick={onClose}
          className="anim-fade fixed inset-0 z-40 bg-surface-inverse/25 backdrop-blur-[1px]"
        />
      ) : null}

      <aside
        ref={trapRef as React.RefObject<HTMLElement>}
        aria-label={t("actionCenter.actionDetail")}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-line bg-surface shadow-overlay",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        {row === null || context === null ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-xs text-content-tertiary">{t("actionCenter.noActionSelected")}</p>
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-start gap-2.5 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <PriorityChip band={row.priorityBand} size="sm" />
                  <StatusBadge status={row.status} kind="action" size="sm" />
                  {sla ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
                        sla.className,
                      )}
                    >
                      <Icon name={sla.icon} size="xs" />
                      {sla.label}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-1.5 text-base font-semibold leading-5 text-content">
                  {row.title}
                </h2>
                <p className="mt-0.5 text-2xs text-content-tertiary">
                  {row.origin === "AI_SUGGESTED"
                    ? "AI suggested"
                    : row.origin === "PLAYBOOK"
                      ? "From a playbook"
                      : "Raised manually"}
                  {" · due "}
                  {formatDue(row.dueAt, DEMO_NOW, fmt)}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.close")}>
                <Icon name="X" size="sm" />
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
              <p className="text-xs leading-relaxed text-content-secondary">
                {row.description}
              </p>

              {row.completionPct > 0 && row.isOpen ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-2xs">
                    <span className="text-content-tertiary">{t("actionCenter.progress")}</span>
                    <span className="font-semibold tabular-nums text-content">
                      {row.completionPct}%
                    </span>
                  </div>
                  <ProgressBar value={row.completionPct} className="mt-1" />
                </div>
              ) : null}

              {/* Case summary */}
              <div className="mt-4 rounded-md border border-line bg-surface-subtle p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={caseHref(row.caseNo)}
                      className="font-mono text-2xs text-accent transition-colors duration-150 hover:underline"
                    >
                      {row.caseNo}
                    </Link>
                    <p className="mt-0.5 truncate text-xs font-medium text-content">
                      {row.context.caseTitle}
                    </p>
                  </div>
                  <Icon name="ArrowRight" size="xs" className="mt-1 text-content-tertiary" />
                </div>

                <p className="mt-2 text-2xs leading-relaxed text-content-secondary">
                  {row.context.problem}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <Field label={t("col.plant")}>{row.context.plantName}</Field>
                  <Field label={t("col.category")}>{row.context.exceptionLabel}</Field>
                  <Field label={t("case.revenueAtRisk")}>
                    {formatMoney(row.context.revenueAtRisk, row.context.currency)}
                  </Field>
                  <Field label={t("actionCenter.casePriority")}>
                    {row.context.priorityScore.toFixed(1)} / 100
                  </Field>
                  {row.context.supplierName ? (
                    <Field label={t("case.supplier")}>{row.context.supplierName}</Field>
                  ) : null}
                  {row.context.customerName ? (
                    <Field label={t("case.customer")}>{row.context.customerName}</Field>
                  ) : null}
                </div>
              </div>

              {/* Current owner */}
              <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <OwnerAvatar user={owner ?? sessionUser} size="sm" showName={false} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-content">
                      {row.ownerName}
                    </p>
                    <p className="truncate text-2xs text-content-tertiary">
                      {owner?.jobTitle ?? "Unassigned"}
                    </p>
                  </div>
                </div>
                <AssignMenu
                  users={users}
                  sessionUser={sessionUser}
                  plantCodes={[row.plantCode]}
                  onAssign={(userId) => onAssign([row.id], userId)}
                  align="end"
                >
                  <Button variant="secondary" size="sm">
                    <Icon name="UserCog" size="sm" />
                    {t("actionCenter.reassign")}
                  </Button>
                </AssignMenu>
              </div>

              {/* AI recommendation */}
              {recommendation ? (
                <div className="mt-3 rounded-md border border-accent-line bg-accent-subtle p-3">
                  <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-accent-content">
                    <Icon name="Sparkles" size="xs" />
                    AI recommendation · {recommendation.confidence.score}% confidence
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-content">
                    {recommendation.suggestion}
                  </p>
                  <p className="mt-1 text-2xs leading-relaxed text-content-secondary">
                    {recommendation.rationale}
                  </p>
                  <Button
                    variant={recommendationApplied ? "subtle" : "primary"}
                    size="sm"
                    className="mt-2.5"
                    disabled={recommendationApplied}
                    onClick={() => onApplyRecommendation(recommendation.id)}
                  >
                    <Icon name={recommendationApplied ? "Check" : "Sparkles"} size="sm" />
                    {recommendationApplied ? "Applied" : "Apply recommendation"}
                  </Button>
                </div>
              ) : null}

              {/* Tabs */}
              <div className="mt-4 flex items-center gap-0.5 rounded-md border border-line bg-surface-subtle p-0.5">
                {TABS.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => setTab(entry.key)}
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center gap-1 rounded-sm text-2xs transition-colors duration-150",
                      tab === entry.key
                        ? "bg-surface font-semibold text-content shadow-raised"
                        : "font-medium text-content-tertiary hover:text-content",
                    )}
                  >
                    <Icon name={entry.icon} size="xs" />
                    {entry.label}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                {tab === "timeline" ? (
                  <ol className="space-y-2.5">
                    {context.timeline.slice(-8).reverse().map((event) => (
                      <li key={event.id} className="flex gap-2.5">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-line-strong" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-content">{event.title}</p>
                          <p className="mt-0.5 text-2xs leading-relaxed text-content-secondary">
                            {event.detail}
                          </p>
                          <p className="mt-0.5 text-2xs text-content-tertiary">
                            {event.actorName} · {formatWhen(event.at, DEMO_NOW, fmt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {tab === "comments" ? (
                  context.comments.length === 0 ? (
                    <p className="py-4 text-center text-2xs text-content-tertiary">
                      {t("actionCenter.noDiscussionOnThisCase")}
                    </p>
                  ) : (
                    <ol className="space-y-2.5">
                      {context.comments.map((comment) => (
                        <li
                          key={comment.id}
                          className="rounded-md border border-line bg-surface-subtle p-2.5"
                        >
                          <p className="flex items-center gap-1.5 text-2xs text-content-tertiary">
                            <span className="font-medium text-content">
                              {comment.authorName}
                            </span>
                            · {formatWhen(comment.at, DEMO_NOW, fmt)}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                            {comment.body}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )
                ) : null}

                {tab === "attachments" ? (
                  context.evidence.length === 0 ? (
                    <p className="py-4 text-center text-2xs text-content-tertiary">
                      {t("actionCenter.noEvidenceAttachedToThis")}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {context.evidence.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-start gap-2 rounded-md border border-line px-2.5 py-2"
                        >
                          <Icon
                            name="Paperclip"
                            size="sm"
                            className="mt-0.5 shrink-0 text-content-tertiary"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-content">
                              {file.fileName}
                            </p>
                            <p className="mt-0.5 text-2xs leading-relaxed text-content-tertiary">
                              {file.description}
                            </p>
                            <p className="mt-0.5 text-2xs text-content-tertiary">
                              {file.uploadedByName} · {formatWhen(file.uploadedAt, DEMO_NOW, fmt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}

                {tab === "audit" ? (
                  <ol className="space-y-1.5">
                    {context.audit.slice(0, 10).map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 border-b border-line pb-1.5 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-2xs text-content">
                            <span className="font-medium">{entry.actorName}</span>{" "}
                            {entry.action.toLowerCase()}
                            {entry.field ? (
                              <span className="text-content-secondary">
                                {" "}
                                — {entry.field}
                                {entry.toValue ? ` → ${entry.toValue}` : ""}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-2xs text-content-tertiary">
                            {formatWhen(entry.at, DEMO_NOW, fmt)} ·{" "}
                            {AUDIT_SOURCE_LABEL[entry.source].toLowerCase()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </div>

            {/* Sticky controls */}
            <footer className="shrink-0 space-y-2 border-t border-line px-4 py-3">
              <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-subtle p-0.5">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onSetStatus(row.id, status)}
                    className={cn(
                      "h-7 flex-1 rounded-sm text-2xs transition-colors duration-150",
                      row.status === status
                        ? "bg-surface font-semibold text-content shadow-raised"
                        : "font-medium text-content-tertiary hover:text-content",
                    )}
                  >
                    {status === "IN_PROGRESS" ? "In progress" : status === "TODO" ? "To do" : status === "BLOCKED" ? "Blocked" : "Done"}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                size="md"
                className="w-full"
                disabled={!row.isOpen}
                onClick={() => {
                  onComplete([row.id]);
                  onClose();
                }}
              >
                <Icon name="CircleCheck" size="sm" />
                {row.isOpen ? "Complete action" : "Action complete"}
              </Button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}

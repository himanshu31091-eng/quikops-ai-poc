"use client";

import Link from "next/link";
import { useLabels } from "@/src/i18n/provider";
import { roleShortLabel } from "@/src/domain/labels";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import type { ActivityEvent } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";

/**
 * The operational activity stream.
 *
 * Every event kind gets its own icon and colour from one table, so a new kind
 * is added by extending `EVENT_META` rather than by branching in the render.
 * The feed shows what happened; it never derives whether it mattered.
 */
const EVENT_META: Record<
  ActivityEvent["kind"],
  { icon: string; className: string }
> = {
  SIGNAL_INGESTED: { icon: "PlugZap", className: "text-medium bg-medium-subtle border-medium-line" },
  CASE_CREATED: { icon: "Zap", className: "text-status-new bg-status-new-subtle border-status-new-line" },
  CASE_ASSIGNED: { icon: "UserCog", className: "text-status-assigned bg-status-assigned-subtle border-status-assigned-line" },
  ACTION_COMPLETED: { icon: "CircleCheck", className: "text-success bg-success-subtle border-success-line" },
  VERIFICATION_SUBMITTED: { icon: "ShieldCheck", className: "text-status-verify bg-status-verify-subtle border-status-verify-line" },
  VERIFICATION_APPROVED: { icon: "ShieldCheck", className: "text-success bg-success-subtle border-success-line" },
  VERIFICATION_REJECTED: { icon: "OctagonAlert", className: "text-critical bg-critical-subtle border-critical-line" },
  CASE_ESCALATED: { icon: "TriangleAlert", className: "text-high bg-high-subtle border-high-line" },
  CASE_CLOSED: { icon: "Check", className: "text-status-closed bg-status-closed-subtle border-status-closed-line" },
  COMMENT_ADDED: { icon: "FileText", className: "text-content-tertiary bg-surface-subtle border-line" },
  PLAYBOOK_APPLIED: { icon: "BookMarked", className: "text-status-progress bg-status-progress-subtle border-status-progress-line" },
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  return (
    <ol className="relative space-y-0">
      {events.map((event, index) => {
        const meta = EVENT_META[event.kind];
        const isLast = index === events.length - 1;

        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px bg-line"
                aria-hidden="true"
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-surface",
                meta.className,
              )}
            >
              <Icon name={meta.icon} size="xs" />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs leading-relaxed text-content-secondary">
                {event.summary}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-2xs font-medium text-content">
                  {event.actorName ?? "System"}
                </span>
                {event.actorRole ? (
                  <span className="text-2xs text-content-tertiary">
                    {roleShortLabel(event.actorRole, labels)}
                  </span>
                ) : (
                  <span className="text-2xs text-content-tertiary">{t("dashboard.automated")}</span>
                )}
                <span className="size-1 rounded-full bg-line-strong" />
                <span className="text-2xs tabular-nums text-content-tertiary">
                  {formatWhen(event.at, DEMO_NOW, fmt)}
                </span>
                {event.caseNo ? (
                  <>
                    <span className="size-1 rounded-full bg-line-strong" />
                    <Link
                      href={caseHref(event.caseNo)}
                      className="font-mono text-2xs text-content-tertiary transition-colors duration-150 hover:text-accent"
                    >
                      {event.caseNo}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

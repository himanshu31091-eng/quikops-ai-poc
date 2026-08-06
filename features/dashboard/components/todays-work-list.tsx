import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { StatusBadge } from "@/components/patterns/status-badge";
import { ACTION_STATUS_META, PRIORITY_META } from "@/src/config/app-config";
import type { ActionItem } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";

const ORIGIN_LABEL = {
  AI_SUGGESTED: { label: "AI suggested", icon: "Sparkles" },
  PLAYBOOK: { label: "Playbook", icon: "BookMarked" },
  MANUAL: { label: "Manual", icon: "UserCog" },
} as const;

export function TodaysWorkList({ actions }: { actions: ActionItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {actions.map((action) => {
        const overdue = new Date(action.dueAt).getTime() < DEMO_NOW.getTime();
        const origin = ORIGIN_LABEL[action.origin];

        return (
          <li key={action.id} className="group flex gap-2.5 px-4 py-3 transition-colors duration-150 hover:bg-surface-subtle">
            <span
              className={cn(
                "mt-0.5 h-full w-[3px] shrink-0 self-stretch rounded-full",
                PRIORITY_META[action.priorityBand].railClassName,
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-content">{action.title}</p>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={caseHref(action.caseNo)}
                  className="font-mono text-2xs text-content-tertiary transition-colors duration-150 hover:text-accent"
                >
                  {action.caseNo}
                </Link>
                <span className="font-mono text-2xs text-content-tertiary">
                  {action.plantCode}
                </span>
                <span className="flex items-center gap-1 text-2xs text-content-tertiary">
                  <Icon name={origin.icon} size="xs" />
                  {origin.label}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <StatusBadge
                  status={action.status}
                  kind="action"
                  size="sm"
                  showDot={false}
                />
                <span
                  className={cn(
                    "text-2xs tabular-nums",
                    overdue ? "font-medium text-critical" : "text-content-tertiary",
                  )}
                >
                  {formatDue(action.dueAt, DEMO_NOW)}
                </span>
              </div>
            </div>

            <span className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-content-tertiary",
              "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
              ACTION_STATUS_META[action.status] ? "" : "",
            )}>
              <Icon name="Check" size="xs" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

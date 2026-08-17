"use client";

import * as React from "react";
import { useFormat } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { EXCEPTION_META } from "@/src/config/app-config";
import type { CaseStatusGroup } from "@/src/domain/case-status";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue, formatNumber, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { WorkCaseRow } from "../types";
import { caseHref } from "@/src/lib/routes";
import { CaseRowActions } from "./case-row-actions";
import { SelectionBox } from "./selection-box";

interface CaseCardListProps {
  rows: WorkCaseRow[];
  selectedIds: Set<string>;
  users: User[];
  sessionUser: User;
  onToggleSelect: (id: string) => void;
  onOpen: (caseNo: string) => void;
  onAssign: (ids: string[], userId: string) => void;
  onMove: (ids: string[], group: CaseStatusGroup) => void;
  onClose: (ids: string[]) => void;
  onNotify: (message: string) => void;
}

const PAGE_SIZE = 25;

/**
 * The small-screen presentation of the same rows. A table squeezed onto a phone
 * is unreadable, so the columns become a card with the four values a manager
 * checks on the floor: what, how urgent, who owns it, when it is due.
 */
export function CaseCardList({
  rows,
  selectedIds,
  users,
  sessionUser,
  onToggleSelect,
  onOpen,
  onAssign,
  onMove,
  onClose,
  onNotify,
}: CaseCardListProps) {
  const fmt = useFormat();
  const [limit, setLimit] = React.useState(PAGE_SIZE);

  const signature = `${rows.length}:${rows[0]?.id ?? ""}`;
  const lastSignature = React.useRef(signature);
  React.useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      setLimit(PAGE_SIZE);
    }
  }, [signature]);

  const visible = rows.slice(0, limit);
  const remaining = rows.length - visible.length;

  return (
    <div className="flex flex-col gap-2 p-2">
      {visible.map((row) => {
        const exception = EXCEPTION_META[row.exceptionType];
        const selected = selectedIds.has(row.id);

        return (
          <article
            key={row.id}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("[data-row-interactive]")) return;
              if (window.getSelection()?.toString()) return;
              onOpen(row.caseNo);
            }}
            className={cn(
              "rounded-md border p-3 transition-colors duration-150",
              selected ? "border-accent-line bg-accent-subtle" : "border-line bg-surface",
            )}
          >
            <header className="flex items-center gap-2">
              <SelectionBox
                checked={selected}
                onToggle={() => onToggleSelect(row.id)}
                label={`Select ${row.caseNo}`}
              />
              <Link
                href={caseHref(row.caseNo)}
                data-row-interactive
                className="font-mono text-2xs text-content-tertiary hover:text-accent hover:underline"
              >
                {row.caseNo}
              </Link>
              <span className="ml-auto flex items-center gap-1.5">
                <StatusBadge status={row.status} size="sm" />
                <CaseRowActions
                  row={row}
                  users={users}
                  sessionUser={sessionUser}
                  onAssign={onAssign}
                  onMove={onMove}
                  onClose={onClose}
                  onNotify={onNotify}
                />
              </span>
            </header>

            <Link
              href={caseHref(row.caseNo)}
              data-row-interactive
              className="mt-2 block text-sm font-medium leading-snug text-content"
            >
              {row.title}
            </Link>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-content-tertiary">
              <span className="flex items-center gap-1">
                <Icon name={exception.icon} size="xs" />
                {exception.label}
              </span>
              <span>·</span>
              <span className="font-mono">{row.plantCode}</span>
              <span>·</span>
              <span>{formatWhen(row.lastDetectedAt, DEMO_NOW, fmt)}</span>
              {row.recurrenceCount > 1 ? (
                <span className="rounded-sm border border-high-line bg-high-subtle px-1 font-medium text-high-content">
                  {row.recurrenceCount}× detected
                </span>
              ) : null}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <span data-row-interactive className="inline-flex">
                <PriorityChip
                  band={row.priorityBand}
                  score={row.priorityScore}
                  factors={row.priorityFactors}
                  size="sm"
                />
              </span>
              <MoneyCell
                amount={row.revenueAtRisk}
                emphasis={row.priorityBand === "CRITICAL" ? "risk" : "strong"}
                compact={false}
                className="text-xs"
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <OwnerAvatar user={row.owner} size="sm" />
              <span
                className={cn(
                  "text-2xs tabular-nums",
                  row.isOverdue ? "font-medium text-critical" : "text-content-tertiary",
                )}
              >
                {formatDue(row.dueAt, DEMO_NOW, fmt)} · {row.ageDays}d old
              </span>
            </div>
          </article>
        );
      })}

      {remaining > 0 ? (
        <Button
          variant="secondary"
          size="md"
          className="mt-1 w-full"
          onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
        >
          Show {formatNumber(Math.min(remaining, PAGE_SIZE))} more
          <span className="text-content-tertiary">of {formatNumber(remaining)}</span>
        </Button>
      ) : null}
    </div>
  );
}

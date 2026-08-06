"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { EXCEPTION_META } from "@/src/config/app-config";
import type { CaseStatusGroup } from "@/src/domain/case-status";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { WorkCaseRow } from "../types";
import { caseHref } from "@/src/lib/routes";
import { CaseRowActions } from "./case-row-actions";
import { SelectionBox } from "./selection-box";

interface CaseBoardCardProps {
  row: WorkCaseRow;
  selected: boolean;
  dragging: boolean;
  users: User[];
  sessionUser: User;
  onToggleSelect: (id: string) => void;
  onOpen: (caseNo: string) => void;
  onAssign: (ids: string[], userId: string) => void;
  onMove: (ids: string[], group: CaseStatusGroup) => void;
  onClose: (ids: string[]) => void;
  onNotify: (message: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export const CaseBoardCard = React.memo(function CaseBoardCard({
  row,
  selected,
  dragging,
  users,
  sessionUser,
  onToggleSelect,
  onOpen,
  onAssign,
  onMove,
  onClose,
  onNotify,
  onDragStart,
  onDragEnd,
}: CaseBoardCardProps) {
  const exception = EXCEPTION_META[row.exceptionType];

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.id);
        onDragStart(row.id);
      }}
      onDragEnd={onDragEnd}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-row-interactive]")) return;
        if (window.getSelection()?.toString()) return;
        onOpen(row.caseNo);
      }}
      className={cn(
        "group cursor-pointer rounded-md border bg-surface p-2.5 transition-colors duration-150",
        selected
          ? "border-accent-line bg-accent-subtle"
          : "border-line hover:border-line-strong hover:bg-surface-subtle",
        dragging ? "opacity-40" : "",
      )}
    >
      <header className="flex items-start gap-2">
        <span className="mt-0.5 flex items-center gap-1.5">
          <Icon
            name="GripVertical"
            size="xs"
            className="cursor-grab text-content-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          />
          <SelectionBox
            checked={selected}
            onToggle={() => onToggleSelect(row.id)}
            label={`Select ${row.caseNo}`}
            className={cn(
              selected ? "" : "opacity-0 transition-opacity duration-150",
              "group-hover:opacity-100",
            )}
          />
        </span>

        <Link
          href={caseHref(row.caseNo)}
          data-row-interactive
          className="mt-0.5 font-mono text-2xs text-content-tertiary transition-colors duration-150 hover:text-accent hover:underline"
        >
          {row.caseNo}
        </Link>

        <span className="ml-auto flex items-center gap-1">
          {row.isOverdue ? (
            <span
              title="Past SLA"
              className="flex items-center gap-1 rounded-sm border border-critical-line bg-critical-subtle px-1 text-2xs font-medium text-critical-content"
            >
              <Icon name="TriangleAlert" size="xs" />
              SLA
            </span>
          ) : null}
          <span
            className={cn(
              "opacity-0 transition-opacity duration-150",
              "group-hover:opacity-100 has-data-[state=open]:opacity-100",
            )}
          >
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
        </span>
      </header>

      <Link
        href={caseHref(row.caseNo)}
        data-row-interactive
        className="mt-1.5 line-clamp-2 block text-sm font-medium leading-snug text-content transition-colors duration-150 group-hover:text-accent"
      >
        {row.title}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-content-tertiary">
        <span className="flex items-center gap-1">
          <Icon name={exception.icon} size="xs" />
          {exception.label}
        </span>
        <span>·</span>
        <span className="font-mono">{row.plantCode}</span>
        {row.recurrenceCount > 1 ? (
          <span className="rounded-sm border border-high-line bg-high-subtle px-1 font-medium text-high-content">
            {row.recurrenceCount}×
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
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
          compact
          className="text-xs"
        />
      </div>

      <footer className="mt-2 flex items-center justify-between gap-2">
        <OwnerAvatar user={row.owner} size="sm" />
        <span
          className={cn(
            "shrink-0 text-2xs tabular-nums",
            row.isOverdue ? "font-medium text-critical" : "text-content-tertiary",
          )}
        >
          {formatDue(row.dueAt, DEMO_NOW)}
        </span>
      </footer>
    </article>
  );
});

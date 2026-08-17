"use client";

import * as React from "react";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { StatusBadge } from "@/components/patterns/status-badge";
import { DETECTION_SOURCE_META, EXCEPTION_META } from "@/src/config/app-config";
import type { CaseStatusGroup } from "@/src/domain/case-status";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { WorkCaseRow } from "../types";
import { caseHref } from "@/src/lib/routes";
import { CaseRowActions } from "./case-row-actions";
import { SelectionBox } from "./selection-box";

export const ROW_HEIGHT = 56;

interface CaseTableRowProps {
  row: WorkCaseRow;
  selected: boolean;
  users: User[];
  sessionUser: User;
  onToggleSelect: (id: string) => void;
  onOpen: (caseNo: string) => void;
  onAssign: (ids: string[], userId: string) => void;
  onMove: (ids: string[], group: CaseStatusGroup) => void;
  onClose: (ids: string[]) => void;
  onNotify: (message: string) => void;
}

const CELL = "px-2.5 align-middle";

/**
 * One case. Memoised on identity: filtering and sorting reorder the same row
 * objects, so a search keystroke re-renders the table shell and nothing else.
 */
export const CaseTableRow = React.memo(function CaseTableRow({
  row,
  selected,
  users,
  sessionUser,
  onToggleSelect,
  onOpen,
  onAssign,
  onMove,
  onClose,
  onNotify,
}: CaseTableRowProps) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const exception = EXCEPTION_META[row.exceptionType];
  const detection = DETECTION_SOURCE_META[row.detectedBy];

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>) => {
      if ((event.target as HTMLElement).closest("[data-row-interactive]")) return;
      // Never navigate away from a selection the user is making with the mouse.
      if (window.getSelection()?.toString()) return;
      onOpen(row.caseNo);
    },
    [onOpen, row.caseNo],
  );

  const handleToggle = React.useCallback(
    () => onToggleSelect(row.id),
    [onToggleSelect, row.id],
  );

  return (
    <tr
      onClick={handleClick}
      aria-selected={selected}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "group cursor-pointer border-b border-line transition-colors duration-150",
        selected ? "bg-accent-subtle" : "bg-surface hover:bg-surface-subtle",
      )}
    >
      <td className={cn(CELL, "pl-3")}>
        <SelectionBox
          checked={selected}
          onToggle={handleToggle}
          label={`Select ${row.caseNo}`}
          className={cn(
            selected ? "" : "opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 focus-visible:opacity-100",
          )}
        />
      </td>

      <td className={CELL}>
        <span className="flex items-center gap-1.5">
          <Link
            href={caseHref(row.caseNo)}
            data-row-interactive
            className="font-mono text-2xs text-content-secondary transition-colors duration-150 hover:text-accent hover:underline"
          >
            {row.caseNo}
          </Link>
          {row.isDraft ? (
            <span
              title={t("workManager.createdInThisSession")}
              className="size-1.5 shrink-0 rounded-full bg-accent"
            />
          ) : row.isDirty ? (
            <span
              title={t("workManager.changedInThisSession")}
              className="size-1.5 shrink-0 rounded-full bg-high"
            />
          ) : null}
        </span>
      </td>

      <td className={CELL}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-7 w-[3px] shrink-0 rounded-full",
              row.isOverdue ? "bg-critical" : "bg-transparent",
            )}
          />
          <div className="min-w-0">
            <Link
              href={caseHref(row.caseNo)}
              data-row-interactive
              className="block truncate text-sm font-medium text-content transition-colors duration-150 group-hover:text-accent"
            >
              {row.title}
            </Link>
            <div className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              {row.materialCode ? (
                <span className="font-mono">{row.materialCode}</span>
              ) : null}
              {row.customerName ? (
                <span className="truncate">· {row.customerName}</span>
              ) : null}
              {row.recurrenceCount > 1 ? (
                <span className="shrink-0 rounded-sm border border-high-line bg-high-subtle px-1 font-medium text-high-content">
                  {row.recurrenceCount}×
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </td>

      <td className={CELL}>
        <span
          title={`${row.plant.name}, ${row.plant.country}`}
          className="font-mono text-xs text-content-secondary"
        >
          {row.plantCode}
        </span>
      </td>

      <td className={CELL}>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-content-secondary">
          <Icon name={exception.icon} size="sm" className="shrink-0 text-content-tertiary" />
          <span className="truncate">{exception.label}</span>
        </span>
      </td>

      <td className={CELL}>
        <span data-row-interactive className="inline-flex">
          <PriorityChip
            band={row.priorityBand}
            score={row.priorityScore}
            factors={row.priorityFactors}
            size="sm"
          />
        </span>
      </td>

      <td className={CELL}>
        <StatusBadge status={row.status} size="sm" />
      </td>

      <td className={CELL}>
        <OwnerAvatar user={row.owner} size="sm" />
      </td>

      <td className={cn(CELL, "text-right")}>
        <MoneyCell
          amount={row.revenueAtRisk}
          emphasis={row.priorityBand === "CRITICAL" ? "risk" : "strong"}
          compact={false}
          className="text-xs"
        />
      </td>

      <td className={CELL}>
        <span
          className={cn(
            "text-xs tabular-nums",
            row.isOverdue
              ? "font-medium text-critical"
              : row.isOpen && row.dueInDays <= 1
                ? "font-medium text-high-content"
                : "text-content-secondary",
          )}
        >
          {formatDue(row.dueAt, DEMO_NOW, fmt)}
        </span>
      </td>

      <td className={CELL}>
        <span className="text-xs tabular-nums text-content-secondary">{row.ageDays}d</span>
      </td>

      <td className={CELL}>
        <span
          title={detection.description}
          className="flex items-center gap-1.5 text-xs text-content-secondary"
        >
          <Icon name={detection.icon} size="xs" className="shrink-0 text-content-tertiary" />
          <span className="truncate">{formatWhen(row.lastDetectedAt, DEMO_NOW, fmt)}</span>
        </span>
      </td>

      <td className={cn(CELL, "pr-3 text-right")}>
        <span
          className={cn(
            "inline-flex opacity-0 transition-opacity duration-150",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "has-data-[state=open]:opacity-100",
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
      </td>
    </tr>
  );
});

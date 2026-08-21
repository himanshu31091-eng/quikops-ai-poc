"use client";

import * as React from "react";
import type { Translate } from "@/src/domain/labels";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { AssignMenu } from "@/components/patterns/assign-menu";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import { ACTION_SLA_META } from "@/src/domain/action-sla";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { formatDue } from "@/src/lib/format";
import type { ActionRow, ActionSort, ActionSortKey } from "../types";

/**
 * The action queue.
 *
 * Rows are clickable, but the checkbox, the owner menu and the complete button
 * are not — a manager triaging with the mouse must be able to tick five boxes
 * without the drawer opening five times. Every interactive control inside a row
 * stops propagation for that reason.
 */

interface Column {
  key: ActionSortKey | "select";
  label: string;
  className: string;
  sortable: boolean;
}

const buildColumns = (t: Translate): Column[] => [
  { key: "select", label: "", className: "w-9", sortable: false },
  { key: "priority", label: t("col.priority"), className: "w-24", sortable: true },
  { key: "case", label: "Case", className: "w-40", sortable: true },
  { key: "action", label: t("col.action"), className: "min-w-0", sortable: true },
  { key: "owner", label: t("col.owner"), className: "w-40", sortable: true },
  { key: "due", label: t("col.dueDate"), className: "w-28", sortable: true },
  { key: "sla", label: "SLA", className: "w-28", sortable: true },
  { key: "status", label: t("col.status"), className: "w-32", sortable: true },
];

const HEAD_CLASS =
  "px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-content-tertiary";

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150",
        checked || indeterminate
          ? "border-accent bg-accent text-white"
          : "border-line-control bg-surface hover:border-accent",
      )}
    >
      {indeterminate ? (
        <Icon name="Minus" size="xs" strokeWidth={3} />
      ) : checked ? (
        <Icon name="Check" size="xs" strokeWidth={3} />
      ) : null}
    </button>
  );
}

const ActionQueueRow = React.memo(function ActionQueueRow({
  row,
  selected,
  users,
  sessionUser,
  onToggle,
  onOpen,
  onComplete,
  onAssign,
}: {
  row: ActionRow;
  selected: boolean;
  users: User[];
  sessionUser: User;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onComplete: (ids: string[]) => void;
  onAssign: (ids: string[], userId: string) => void;
}) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const sla = ACTION_SLA_META[row.slaState];

  return (
    <tr
      onClick={() => onOpen(row.id)}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(row.id);
        }
      }}
      aria-label={`Open ${row.title}`}
      className={cn(
        "group cursor-pointer border-b border-line transition-colors duration-150 last:border-0",
        selected ? "bg-accent-subtle" : "hover:bg-surface-hover",
        row.isDirty && "anim-settle",
      )}
    >
      <td className="px-3 py-2">
        <Checkbox
          checked={selected}
          onChange={() => onToggle(row.id)}
          label={`Select ${row.title}`}
        />
      </td>

      <td className="px-3 py-2">
        <PriorityChip band={row.priorityBand} size="sm" />
      </td>

      <td className="px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-2xs text-content-secondary">{row.caseNo}</p>
          <p className="truncate text-2xs text-content-tertiary">{row.context.plantName}</p>
        </div>
      </td>

      <td className="min-w-0 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {row.origin === "AI_SUGGESTED" ? (
            <Icon name="Sparkles" size="xs" className="shrink-0 text-accent" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-content">{row.title}</p>
            <p className="truncate text-2xs text-content-tertiary">{row.context.caseTitle}</p>
          </div>
        </div>
      </td>

      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
        <AssignMenu
          users={users}
          sessionUser={sessionUser}
          plantCodes={[row.plantCode]}
          onAssign={(userId) => onAssign([row.id], userId)}
          align="start"
        >
          <button
            type="button"
            className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors duration-150 hover:bg-surface-active"
          >
            <OwnerAvatar
              {...(users.find((user) => user.id === row.ownerId)
                ? { user: users.find((user) => user.id === row.ownerId)! }
                : { user: sessionUser })}
              size="sm"
              showName={false}
            />
            <span className="min-w-0 truncate text-2xs text-content-secondary">
              {row.ownerName}
            </span>
          </button>
        </AssignMenu>
      </td>

      <td className="px-3 py-2">
        <span
          className={cn(
            "text-2xs tabular-nums",
            row.isOverdue ? "font-semibold text-critical-content" : "text-content-secondary",
          )}
        >
          {formatDue(row.dueAt, DEMO_NOW, fmt)}
        </span>
      </td>

      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
            sla.className,
          )}
        >
          <Icon name={sla.icon} size="xs" />
          {sla.shortLabel}
        </span>
      </td>

      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={row.status} kind="action" size="sm" />
          {row.isOpen ? (
            <button
              type="button"
              aria-label={`Complete ${row.title}`}
              title={t("action.markComplete")}
              onClick={(event) => {
                event.stopPropagation();
                onComplete([row.id]);
              }}
              className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Icon
                name="CircleCheck"
                size="sm"
                className="text-content-tertiary hover:text-success"
              />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
});

interface ActionQueueProps {
  rows: ActionRow[];
  totalCount: number;
  selectedIds: Set<string>;
  sort: ActionSort;
  page: number;
  pageCount: number;
  users: User[];
  sessionUser: User;
  isFiltered: boolean;
  onToggleSort: (key: ActionSortKey) => void;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  onComplete: (ids: string[]) => void;
  onAssign: (ids: string[], userId: string) => void;
  onSetPage: (page: number) => void;
  onClearFilters: () => void;
}

export function ActionQueue({
  rows,
  totalCount,
  selectedIds,
  sort,
  page,
  pageCount,
  users,
  sessionUser,
  isFiltered,
  onToggleSort,
  onToggleRow,
  onToggleAll,
  onOpen,
  onComplete,
  onAssign,
  onSetPage,
  onClearFilters,
}: ActionQueueProps) {
  const { t } = useTranslation();
  const visibleIds = rows.map((row) => row.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && visibleIds.some((id) => selectedIds.has(id));

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={isFiltered ? "SearchX" : "CircleCheck"}
        title={isFiltered ? "No actions match these filters" : "Nothing needs attention"}
        description={
          isFiltered
            ? "Widen the filters, or clear them to see the whole queue."
            : "Every corrective action across the network is complete or scheduled beyond this view."
        }
        {...(isFiltered
          ? {
              action: (
                <Button variant="secondary" size="md" onClick={onClearFilters}>
                  <Icon name="X" size="sm" />
                  {t("common.clearFilters")}
                </Button>
              ),
            }
          : {})}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-240 border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              {buildColumns(t).map((column) => {
                if (column.key === "select") {
                  return (
                    <th scope="col" key="select" className={cn(HEAD_CLASS, column.className)}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={onToggleAll}
                        label={t("actionCenter.selectAllVisibleActions")}
                      />
                    </th>
                  );
                }
                const active = sort.key === column.key;
                return (
                  <th scope="col" key={column.key} className={cn(HEAD_CLASS, column.className)}>
                    <button
                      type="button"
                      onClick={() => onToggleSort(column.key as ActionSortKey)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors duration-150 hover:text-content",
                        active && "text-content",
                      )}
                    >
                      {column.label}
                      <Icon
                        name={
                          active
                            ? sort.direction === "asc"
                              ? "ChevronUp"
                              : "ChevronDown"
                            : "ChevronsUpDown"
                        }
                        size="xs"
                        className={active ? "text-accent" : "text-content-tertiary"}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ActionQueueRow
                key={row.id}
                row={row}
                selected={selectedIds.has(row.id)}
                users={users}
                sessionUser={sessionUser}
                onToggle={onToggleRow}
                onOpen={onOpen}
                onComplete={onComplete}
                onAssign={onAssign}
              />
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
          <span className="text-2xs text-content-tertiary tabular-nums">
            Page {page} of {pageCount} · {totalCount} action{totalCount === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onSetPage(page - 1)}
              disabled={page <= 1}
            >
              <Icon name="ChevronLeft" size="xs" />
              {t("actionCenter.previous")}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onSetPage(page + 1)}
              disabled={page >= pageCount}
            >
              {t("actionCenter.next")}
              <Icon name="ChevronRight" size="xs" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

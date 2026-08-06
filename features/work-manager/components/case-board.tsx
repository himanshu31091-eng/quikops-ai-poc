"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import {
  CASE_STATUS_GROUPS,
  STATUS_GROUP_META,
  type CaseStatusGroup,
} from "@/src/domain/case-status";
import type { User } from "@/src/domain/types";
import { formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { WorkCaseRow } from "../types";
import { CaseBoardCard } from "./case-board-card";

interface CaseBoardProps {
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

/** Cards rendered per column before the column asks the user to narrow further.
 *  Keeps the board responsive without hiding work: the count stays honest and
 *  the overflow line says exactly how many are not drawn. */
const COLUMN_RENDER_LIMIT = 40;

export function CaseBoard({
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
}: CaseBoardProps) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<CaseStatusGroup | null>(null);

  const columns = React.useMemo(() => {
    const grouped = new Map<CaseStatusGroup, WorkCaseRow[]>(
      CASE_STATUS_GROUPS.map((group) => [group, []]),
    );
    for (const row of rows) grouped.get(row.statusGroup)?.push(row);
    return CASE_STATUS_GROUPS.map((group) => {
      const items = grouped.get(group) ?? [];
      return {
        group,
        items,
        revenue: items.reduce((sum, row) => sum + row.revenueAtRisk, 0),
        overdue: items.filter((row) => row.isOverdue).length,
      };
    });
  }, [rows]);

  const handleDragStart = React.useCallback((id: string) => setDraggingId(id), []);
  const handleDragEnd = React.useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="flex gap-3 overflow-x-auto p-3">
      {columns.map((column) => {
        const meta = STATUS_GROUP_META[column.group];
        const isTarget = dropTarget === column.group;
        const hidden = Math.max(0, column.items.length - COLUMN_RENDER_LIMIT);

        return (
          <section
            key={column.group}
            aria-label={`${meta.label} — ${column.items.length} cases`}
            onDragOver={(event) => {
              if (!draggingId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (dropTarget !== column.group) setDropTarget(column.group);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
              if (dropTarget === column.group) setDropTarget(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain") || draggingId;
              setDropTarget(null);
              setDraggingId(null);
              if (!id) return;
              const row = rows.find((entry) => entry.id === id);
              if (!row || row.statusGroup === column.group) return;
              onMove([id], column.group);
            }}
            className={cn(
              "flex w-[19rem] shrink-0 flex-col rounded-lg border bg-surface-subtle transition-colors duration-150",
              isTarget ? "border-accent bg-accent-subtle" : "border-line",
            )}
          >
            <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <span className={cn("size-2 shrink-0 rounded-full", meta.dotClassName)} />
              <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-content">
                {meta.label}
              </h3>
              <span className="shrink-0 rounded-sm bg-surface-active px-1.5 text-2xs font-semibold tabular-nums text-content-secondary">
                {formatNumber(column.items.length)}
              </span>
            </header>

            <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-2xs text-content-tertiary">
              <MoneyCell amount={column.revenue} compact className="text-2xs" />
              <span>at risk</span>
              {column.overdue > 0 ? (
                <span className="ml-auto flex items-center gap-1 font-medium text-critical">
                  <Icon name="TriangleAlert" size="xs" />
                  {column.overdue} overdue
                </span>
              ) : null}
            </div>

            <div className="flex max-h-[calc(100dvh-24rem)] min-h-[6rem] flex-col gap-2 overflow-y-auto p-2">
              {column.items.length === 0 ? (
                <p className="flex flex-1 items-center justify-center px-2 py-6 text-center text-2xs text-content-tertiary">
                  {isTarget ? "Drop to move here" : "No cases in this state"}
                </p>
              ) : (
                <>
                  {column.items.slice(0, COLUMN_RENDER_LIMIT).map((row) => (
                    <CaseBoardCard
                      key={row.id}
                      row={row}
                      selected={selectedIds.has(row.id)}
                      dragging={draggingId === row.id}
                      users={users}
                      sessionUser={sessionUser}
                      onToggleSelect={onToggleSelect}
                      onOpen={onOpen}
                      onAssign={onAssign}
                      onMove={onMove}
                      onClose={onClose}
                      onNotify={onNotify}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                  {hidden > 0 ? (
                    <p className="rounded-md border border-dashed border-line px-2 py-2 text-center text-2xs text-content-tertiary">
                      {formatNumber(hidden)} more in this column — narrow the filters or
                      switch to table view.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import type { CaseStatusGroup } from "@/src/domain/case-status";
import type { User } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import { useVirtualRows } from "../hooks/use-virtual-rows";
import type { SortKey, WorkCaseRow, WorkSort } from "../types";
import { SORT_META } from "../utils/filter-definitions";
import { CaseTableRow, ROW_HEIGHT } from "./case-table-row";
import { SelectionBox } from "./selection-box";

interface CaseTableProps {
  rows: WorkCaseRow[];
  selectedIds: Set<string>;
  sort: WorkSort;
  users: User[];
  sessionUser: User;
  onSort: (key: SortKey) => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (caseNo: string) => void;
  onAssign: (ids: string[], userId: string) => void;
  onMove: (ids: string[], group: CaseStatusGroup) => void;
  onClose: (ids: string[]) => void;
  onNotify: (message: string) => void;
}

interface ColumnSpec {
  key: string;
  label: string;
  width: number | null;
  sortKey?: SortKey;
  align?: "left" | "right";
}

/**
 * Column widths are declared once and shared by the colgroup and the sticky
 * header, so the header can never drift from the body while the table scrolls.
 */
const COLUMNS: ColumnSpec[] = [
  { key: "select", label: "", width: 40 },
  // 142, not 118: the Perma case-number format (QO-PA-2026-00421) is four
  // characters longer than the one this column was sized for and wrapped onto a
  // second line, inflating every row. Funded from Category and Owner, both of
  // which truncate gracefully and had slack.
  { key: "caseNo", label: "Case ID", width: 142, sortKey: "caseNo" },
  { key: "title", label: "Title", width: null, sortKey: "title" },
  // Plant, age and revenue are sized to their content, which is a four-character
  // code, "38d" and "$248,000". The 28px they give back is exactly what widening
  // status and priority took, so the flexible Title column — the column a reader
  // actually needs — is no narrower than before.
  { key: "plant", label: "Plant", width: 60, sortKey: "plant" },
  { key: "category", label: "Category", width: 120, sortKey: "category" },
  // Sized to the widest label each column can hold on one line — "Critical 78.5"
  // and "Pending verification". At the previous 122/138 the status badge did not
  // fit its cell and wrapped out of its own fixed height.
  { key: "priority", label: "Priority", width: 130, sortKey: "priority" },
  { key: "status", label: "Status", width: 158, sortKey: "status" },
  { key: "owner", label: "Owner", width: 128, sortKey: "owner" },
  { key: "revenue", label: "Revenue impact", width: 108, sortKey: "revenue", align: "right" },
  { key: "due", label: "Due date", width: 108, sortKey: "due" },
  { key: "age", label: "Age", width: 52, sortKey: "age" },
  { key: "detected", label: "Detected", width: 116, sortKey: "detected" },
  { key: "actions", label: "", width: 48, align: "right" },
];

const MIN_TABLE_WIDTH = 1380;

export function CaseTable({
  rows,
  selectedIds,
  sort,
  users,
  sessionUser,
  onSort,
  onToggleSelect,
  onToggleAll,
  onOpen,
  onAssign,
  onMove,
  onClose,
  onNotify,
}: CaseTableProps) {
  const { setContainer, startIndex, endIndex, paddingTop, paddingBottom, scrollToTop } =
    useVirtualRows({ rowCount: rows.length, rowHeight: ROW_HEIGHT });

  // A new working set always starts at the top; scrolling position from the
  // previous filter is meaningless against different rows.
  const signature = `${rows.length}:${rows[0]?.id ?? ""}:${sort.key}:${sort.direction}`;
  const lastSignature = React.useRef(signature);
  React.useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      scrollToTop();
    }
  }, [signature, scrollToTop]);

  const visible = rows.slice(startIndex, endIndex);
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = !allSelected && rows.some((row) => selectedIds.has(row.id));

  return (
    <div
      ref={setContainer}
      className="max-h-[calc(100dvh-19rem)] min-h-[20rem] overflow-auto overscroll-contain"
    >
      <table
        className="w-full table-fixed border-collapse text-left"
        style={{ minWidth: MIN_TABLE_WIDTH }}
      >
        <colgroup>
          {COLUMNS.map((column) => (
            <col
              key={column.key}
              style={column.width === null ? undefined : { width: column.width }}
            />
          ))}
        </colgroup>

        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const isSorted = column.sortKey !== undefined && sort.key === column.sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 border-b border-line bg-surface-subtle px-2.5 py-2",
                    "text-2xs font-semibold uppercase tracking-wider text-content-tertiary",
                    column.align === "right" ? "text-right" : "text-left",
                    column.key === "select" ? "pl-3" : "",
                    column.key === "actions" ? "pr-3" : "",
                  )}
                >
                  {column.key === "select" ? (
                    <SelectionBox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onToggle={onToggleAll}
                      label={allSelected ? "Clear selection" : "Select all visible cases"}
                    />
                  ) : column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sortKey!)}
                      className={cn(
                        // `items-start`, not `items-center`: "Revenue impact"
                        // wraps to two lines in its column, and a centred sort
                        // arrow floats in the gap beside it instead of reading
                        // as part of the header. Identical for one-line labels.
                        "inline-flex items-start gap-1 rounded-sm transition-colors duration-150 hover:text-content",
                        column.align === "right" ? "flex-row-reverse" : "",
                        isSorted ? "text-content" : "",
                      )}
                      title={`Sort by ${SORT_META[column.sortKey].label}`}
                    >
                      {column.label}
                      <Icon
                        name={
                          isSorted
                            ? sort.direction === "asc"
                              ? "ArrowUp"
                              : "ArrowDown"
                            : "ArrowUpDown"
                        }
                        size="xs"
                        className={isSorted ? "text-accent" : "text-content-tertiary/60"}
                      />
                    </button>
                  ) : (
                    <span className="sr-only">{column.label || "Actions"}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 ? (
            <tr aria-hidden="true" style={{ height: paddingTop }} />
          ) : null}

          {visible.map((row) => (
            <CaseTableRow
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              users={users}
              sessionUser={sessionUser}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onAssign={onAssign}
              onMove={onMove}
              onClose={onClose}
              onNotify={onNotify}
            />
          ))}

          {paddingBottom > 0 ? (
            <tr aria-hidden="true" style={{ height: paddingBottom }} />
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

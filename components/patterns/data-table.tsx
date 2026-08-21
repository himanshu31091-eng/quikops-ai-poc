"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/cn";

/**
 * The table shell every module renders through.
 *
 * Execution Analytics, the Action Center and Connector Health each declared
 * their own header and cell classes, sort chevrons and pagination footer —
 * identical strings, three copies, already drifting. This owns the chrome;
 * callers own the columns and the row content.
 *
 * Accessibility is handled once here rather than per module: `scope="col"` on
 * headers, `aria-sort` on the sorted column, `aria-rowcount` on the table, and
 * an `aria-live` announcement of the result count. Getting that right in one
 * place is the main reason this exists.
 */

export const TABLE_HEAD_CLASS =
  "px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-content-tertiary";
export const TABLE_CELL_CLASS = "px-3 py-2 align-middle";

export interface DataTableColumn<TRow, TSortKey extends string = string> {
  key: string;
  label: string;
  /** Present when the column can be sorted; omitted for display-only columns. */
  sortKey?: TSortKey;
  className?: string;
  align?: "left" | "right";
  render: (row: TRow) => React.ReactNode;
}

export interface DataTableSort<TSortKey extends string = string> {
  key: TSortKey;
  direction: "asc" | "desc";
}

interface DataTableProps<TRow, TSortKey extends string = string> {
  rows: TRow[];
  columns: DataTableColumn<TRow, TSortKey>[];
  rowKey: (row: TRow) => string;
  /** Minimum table width before horizontal scroll kicks in. */
  minWidthClass?: string;

  sort?: DataTableSort<TSortKey>;
  onToggleSort?: (key: TSortKey) => void;

  /** Selection is opt-in; omit all three to render a plain table. */
  selectedIds?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;

  onRowClick?: (row: TRow) => void;
  rowClassName?: (row: TRow) => string | undefined;

  /** Pagination is opt-in. Omit to render every row. */
  page?: number;
  pageCount?: number;
  totalCount?: number;
  onSetPage?: (page: number) => void;

  empty: { icon: string; title: string; description: string; action?: React.ReactNode };
  /** Announced to assistive tech when the row count changes. */
  resultLabel?: string;
}

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

export function DataTable<TRow, TSortKey extends string = string>({
  rows,
  columns,
  rowKey,
  minWidthClass = "min-w-160",
  sort,
  onToggleSort,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onRowClick,
  rowClassName,
  page,
  pageCount,
  totalCount,
  onSetPage,
  empty,
  resultLabel,
}: DataTableProps<TRow, TSortKey>) {
  const { t } = useTranslation();
  const selectable = selectedIds !== undefined && onToggleRow !== undefined;
  const ids = rows.map(rowKey);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const someSelected = selectable && !allSelected && ids.some((id) => selectedIds.has(id));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        {...(empty.action ? { action: empty.action } : {})}
        size="sm"
      />
    );
  }

  return (
    <div>
      {resultLabel ? (
        <p className="sr-only" role="status" aria-live="polite">
          {resultLabel}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table
          className={cn("w-full border-collapse", minWidthClass)}
          aria-rowcount={totalCount ?? rows.length}
        >
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              {selectable ? (
                <th scope="col" className={cn(TABLE_HEAD_CLASS, "w-9")}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => onToggleAll?.()}
                    label={t("ui.selectAllVisibleRows")}
                  />
                </th>
              ) : null}

              {columns.map((column) => {
                const active = sort !== undefined && column.sortKey === sort.key;
                const sortable = column.sortKey !== undefined && onToggleSort !== undefined;

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : sortable
                          ? "none"
                          : undefined
                    }
                    className={cn(
                      TABLE_HEAD_CLASS,
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort(column.sortKey!)}
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
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const id = rowKey(row);
              const selected = selectable && selectedIds.has(id);

              return (
                <tr
                  key={id}
                  {...(onRowClick
                    ? {
                        onClick: () => onRowClick(row),
                        tabIndex: 0,
                        onKeyDown: (event: React.KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        },
                      }
                    : {})}
                  className={cn(
                    "border-b border-line transition-colors duration-150 last:border-0",
                    onRowClick && "cursor-pointer",
                    selected ? "bg-accent-subtle" : "hover:bg-surface-hover",
                    rowClassName?.(row),
                  )}
                >
                  {selectable ? (
                    <td className={TABLE_CELL_CLASS}>
                      <Checkbox
                        checked={selected}
                        onChange={() => onToggleRow(id)}
                        label={`Select row ${id}`}
                      />
                    </td>
                  ) : null}

                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        TABLE_CELL_CLASS,
                        column.align === "right" && "text-right",
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {page !== undefined && pageCount !== undefined && pageCount > 1 && onSetPage ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
          <span className="text-2xs tabular-nums text-content-tertiary">
            Page {page} of {pageCount}
            {totalCount !== undefined ? ` · ${totalCount} rows` : ""}
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

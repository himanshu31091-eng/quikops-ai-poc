"use client";

import * as React from "react";

/**
 * Sort, selection and pagination for a module's working set.
 *
 * Every module with a table re-implemented these three: a sort toggle that
 * flips direction on the same key, a selection set with a
 * toggle-all-visible rule, and a page index that has to reset whenever the
 * filters change. Three copies, one of which had a stale-page bug.
 *
 * Lives in `src/hooks/` rather than a feature because more than one feature
 * needs it and features may not import from each other. `src/workflow/
 * execution-store.tsx` set the precedent for React code under `src/`.
 */

export interface TableSort<TKey extends string> {
  key: TKey;
  direction: "asc" | "desc";
}

export interface UseTableStateInput<TKey extends string> {
  initialSort: TableSort<TKey>;
  /**
   * Keys that read ascending first — dates and SLA states, where "soonest" is
   * the useful default and "highest" is not.
   */
  ascendingFirst?: TKey[];
  pageSize?: number;
  /** Row count after filtering. Drives page clamping. */
  totalRows: number;
  /**
   * Changes to this value reset the page to 1. Pass a serialised filter
   * signature: filtering to three rows while sitting on page 4 shows an empty
   * table, which reads as "no results" and is the bug this prevents.
   */
  resetKey: string;
}

export interface TableState<TKey extends string> {
  sort: TableSort<TKey>;
  toggleSort: (key: TKey) => void;

  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  /** Applies the current page window to an already-sorted array. */
  paginate: <TRow>(rows: TRow[]) => TRow[];

  selectedIds: Set<string>;
  toggleRow: (id: string) => void;
  toggleAll: (visibleIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

const DEFAULT_PAGE_SIZE = 12;

export function useTableState<TKey extends string>({
  initialSort,
  ascendingFirst = [],
  pageSize = DEFAULT_PAGE_SIZE,
  totalRows,
  resetKey,
}: UseTableStateInput<TKey>): TableState<TKey> {
  const [sort, setSort] = React.useState<TableSort<TKey>>(initialSort);
  const [page, setPageState] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Reset on filter change. Derived from a key rather than an effect so the
  // corrected page is used in the same render, not one paint later.
  const previousResetKey = React.useRef(resetKey);
  if (previousResetKey.current !== resetKey) {
    previousResetKey.current = resetKey;
    if (page !== 1) setPageState(1);
  }

  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, pageCount);

  const toggleSort = React.useCallback(
    (key: TKey) => {
      setSort((previous) =>
        previous.key === key
          ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
          : { key, direction: ascendingFirst.includes(key) ? "asc" : "desc" },
      );
      setPageState(1);
    },
    // `ascendingFirst` is a literal at every call site; joining it keeps the
    // callback stable instead of rebuilding on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ascendingFirst.join(",")],
  );

  const setPage = React.useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const paginate = React.useCallback(
    <TRow,>(rows: TRow[]): TRow[] =>
      rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [safePage, pageSize],
  );

  const toggleRow = React.useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = React.useCallback((visibleIds: string[]) => {
    setSelectedIds((previous) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => previous.has(id));
      const next = new Set(previous);
      for (const id of visibleIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  return {
    sort,
    toggleSort,
    page: safePage,
    pageCount,
    setPage,
    paginate,
    selectedIds,
    toggleRow,
    toggleAll,
    clearSelection,
    isSelected,
  };
}

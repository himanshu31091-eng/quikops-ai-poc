"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { createCaseAction } from "@/src/data/mutations/work-mutations";
import { statusForGroup, type CaseStatusGroup } from "@/src/domain/case-status";
import type { CaseListItem, Plant, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { useExecutionStore } from "@/src/workflow/execution-store";
import type { WorkflowEventKind } from "@/src/workflow/types";
import { applyExecutionOverride } from "@/src/workflow/projections";
import type {
  ActiveFilterChip,
  MultiFilterField,
  CaseOverride,
  NewCaseDraft,
  SortKey,
  WorkCaseRow,
  WorkFilters,
  WorkKpi,
  WorkQuickStats,
  WorkSort,
  WorkView,
} from "../types";
import {
  buildFilterChips,
  computeKpis,
  computeQuickStats,
  filterRows,
  removeFilterChip,
  sortRows,
} from "../utils/case-filters";
import { buildCaseFromDraft } from "../utils/create-case";
import { toWorkCaseRow } from "../utils/derive";
import { EMPTY_FILTERS, KPI_PRESETS, SORT_META } from "../utils/filter-definitions";
import { exportCasesCsv } from "../utils/export-csv";
import { serializeWorkParams, type WorkViewState } from "../utils/query-state";

/**
 * The single owner of Work Manager state.
 *
 * Components below this hook are presentational: they receive rows and
 * callbacks. Everything derived — rows, KPI counts, quick stats, chips, board
 * columns — is memoised from the same two inputs (server cases + session
 * changes), so the header, the table and the panel can never disagree.
 */

export type { MultiFilterField };

export interface WorkNotice {
  id: number;
  tone: "success" | "info";
  message: string;
}

export interface WorkManagerInput {
  cases: CaseListItem[];
  plants: Plant[];
  assignableUsers: User[];
  sessionUser: User;
  initial: WorkViewState;
  /** True when created cases are written to the database rather than held in session. */
  persistent?: boolean;
}

export interface WorkManagerApi {
  filters: WorkFilters;
  sort: WorkSort;
  view: WorkView;
  rows: WorkCaseRow[];
  allRows: WorkCaseRow[];
  kpis: WorkKpi[];
  quickStats: WorkQuickStats;
  chips: ActiveFilterChip[];
  selectedIds: Set<string>;
  selectedRows: WorkCaseRow[];
  dirtyCount: number;
  isFiltered: boolean;
  isStale: boolean;
  isRefreshing: boolean;
  notice: WorkNotice | null;

  setSearch: (value: string) => void;
  toggleFilterValue: (field: MultiFilterField, value: string) => void;
  clearFilterField: (field: MultiFilterField) => void;
  removeChip: (chipId: string) => void;
  clearFilters: () => void;
  toggleKpi: (key: WorkKpi["key"]) => void;
  toggleSort: (key: SortKey) => void;
  setView: (view: WorkView) => void;

  toggleRow: (id: string) => void;
  toggleAllVisible: () => void;
  clearSelection: () => void;

  assignCases: (ids: string[], userId: string) => void;
  moveCases: (ids: string[], group: CaseStatusGroup) => void;
  closeCases: (ids: string[]) => void;
  createCase: (draft: NewCaseDraft) => string;
  discardChanges: () => void;
  refresh: () => void;
  exportVisible: () => void;
  notify: (message: string) => void;
  dismissNotice: () => void;
}

const NOTICE_TIMEOUT_MS = 6_000;
const NOW_ISO = DEMO_NOW.toISOString();

function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function useWorkManager({
  cases,
  plants,
  assignableUsers,
  sessionUser,
  initial,
  persistent = false,
}: WorkManagerInput): WorkManagerApi {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = React.useState<WorkFilters>(initial.filters);
  const [sort, setSort] = React.useState<WorkSort>(initial.sort);
  const [view, setViewState] = React.useState<WorkView>(initial.view);
  // Outcomes live in the shared execution store, not here: a case closed on the
  // detail page must already be closed when the manager comes back to the queue.
  const execution = useExecutionStore();
  const { overrides, createdCases: drafts } = execution.state;
  const { recordOutcome, addCreatedCase, reset: resetExecution } = execution;
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [notice, setNotice] = React.useState<WorkNotice | null>(null);
  const [isRefreshing, startTransition] = React.useTransition();

  const noticeSeq = React.useRef(0);

  /* ------------------------------------------------------------ Derived rows */

  const userById = React.useMemo(() => {
    const map: Record<string, User> = {};
    for (const user of [...assignableUsers, sessionUser]) map[user.id] = user;
    return map;
  }, [assignableUsers, sessionUser]);

  const allRows = React.useMemo(() => {
    const source = drafts.length > 0 ? [...drafts, ...cases] : cases;
    const draftIds = new Set(drafts.map((draft) => draft.id));
    return source.map((item) =>
      toWorkCaseRow(applyExecutionOverride(item, overrides[item.caseNo], userById), {
        now: DEMO_NOW,
        isDirty: overrides[item.caseNo] !== undefined,
        isDraft: draftIds.has(item.id),
      }),
    );
  }, [cases, drafts, overrides, userById]);

  // Latest-value refs so every callback below can keep a stable identity and the
  // memoised rows are not re-rendered whenever the data changes.
  const allRowsRef = React.useRef<WorkCaseRow[]>(allRows);
  const visibleRowsRef = React.useRef<WorkCaseRow[]>([]);
  React.useEffect(() => {
    allRowsRef.current = allRows;
  }, [allRows]);

  // Typing stays responsive on large sets: the input updates immediately while
  // the filtered list catches up at a lower priority.
  const deferredSearch = React.useDeferredValue(filters.search);
  const queryFilters = React.useMemo(
    () => (deferredSearch === filters.search ? filters : { ...filters, search: deferredSearch }),
    [filters, deferredSearch],
  );

  const rows = React.useMemo(() => {
    const matched = filterRows(allRows, queryFilters, sessionUser.id);
    return sortRows(matched, sort);
  }, [allRows, queryFilters, sessionUser.id, sort]);

  const kpis = React.useMemo(
    () => computeKpis(allRows, filters, sessionUser.id),
    [allRows, filters, sessionUser.id],
  );

  const quickStats = React.useMemo(() => computeQuickStats(rows, allRows), [rows, allRows]);

  const chips = React.useMemo(
    () => buildFilterChips(filters, { plants, users: assignableUsers, sessionUser }),
    [filters, plants, assignableUsers, sessionUser],
  );

  const selectedRows = React.useMemo(
    () => allRows.filter((row) => selectedIds.has(row.id)),
    [allRows, selectedIds],
  );

  const dirtyCount = React.useMemo(
    () => Object.keys(overrides).length + drafts.length,
    [overrides, drafts],
  );

  /* ------------------------------------------------------------------ URL sync */

  React.useEffect(() => {
    const query = serializeWorkParams({ filters, sort, view });
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [filters, sort, view, pathname]);

  /* ------------------------------------------------------------------ Notices */

  const pushNotice = React.useCallback((tone: WorkNotice["tone"], message: string) => {
    noticeSeq.current += 1;
    setNotice({ id: noticeSeq.current, tone, message });
  }, []);

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const notify = React.useCallback(
    (message: string) => pushNotice("info", message),
    [pushNotice],
  );

  const dismissNotice = React.useCallback(() => setNotice(null), []);

  /* ------------------------------------------------------------------ Filters */

  const setSearch = React.useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const toggleFilterValue = React.useCallback((field: MultiFilterField, value: string) => {
    setFilters((prev) => {
      const current = prev[field] as string[];
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }, []);

  const clearFilterField = React.useCallback((field: MultiFilterField) => {
    setFilters((prev) => ({ ...prev, [field]: [] }));
  }, []);

  const removeChip = React.useCallback((chipId: string) => {
    setFilters((prev) => removeFilterChip(prev, chipId));
  }, []);

  const clearFilters = React.useCallback(() => setFilters(EMPTY_FILTERS), []);

  const toggleKpi = React.useCallback((key: WorkKpi["key"]) => {
    setFilters((prev) => {
      const preset = KPI_PRESETS[key];
      return preset.apply(prev, preset.isActive(prev));
    });
  }, []);

  const toggleSort = React.useCallback((key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: SORT_META[key].defaultDirection },
    );
  }, []);

  const setView = React.useCallback((next: WorkView) => setViewState(next), []);

  /* ---------------------------------------------------------------- Selection */

  const toggleRow = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  React.useEffect(() => {
    visibleRowsRef.current = rows;
  }, [rows]);

  const toggleAllVisible = React.useCallback(() => {
    const visible = visibleRowsRef.current.map((row) => row.id);
    setSelectedIds((prev) => {
      const allSelected = visible.length > 0 && visible.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visible.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...visible]);
    });
  }, []);

  /* ----------------------------------------------------------------- Mutations */

  /**
   * Writes one outcome per case into the shared store. The feed entry is
   * attached to the first case only — a bulk action is one line on the
   * dashboard, not twenty.
   */
  const mutate = React.useCallback(
    (
      ids: string[],
      produce: (row: WorkCaseRow) => CaseOverride,
      feed?: { kind: WorkflowEventKind; summary: string },
    ) => {
      const byId = new Map(allRowsRef.current.map((row) => [row.id, row]));
      ids.forEach((id, index) => {
        const row = byId.get(id);
        if (!row) return;
        recordOutcome({
          caseNo: row.caseNo,
          patch: produce(row),
          ...(feed && index === 0
            ? { event: { kind: feed.kind, summary: feed.summary, actor: sessionUser } }
            : {}),
        });
      });
    },
    [recordOutcome, sessionUser],
  );

  const assignCases = React.useCallback(
    (ids: string[], userId: string) => {
      const owner = userById[userId];
      mutate(
        ids,
        (row) => ({
          ownerId: userId,
          assignedAt: NOW_ISO,
          status: row.statusGroup === "DETECTED" ? "ASSIGNED" : row.status,
        }),
        {
          kind: ids.length > 1 ? "BULK_ASSIGNED" : "ASSIGNED",
          summary:
            ids.length > 1
              ? `Assigned ${pluralise(ids.length, "case")} to ${owner?.name ?? "an owner"} from the queue`
              : `Assigned to ${owner?.name ?? "an owner"} from the queue`,
        },
      );
      clearSelection();
      pushNotice(
        "success",
        `${pluralise(ids.length, "case")} assigned to ${owner?.name ?? "the selected owner"}.`,
      );
    },
    [mutate, userById, clearSelection, pushNotice],
  );

  const moveCases = React.useCallback(
    (ids: string[], group: CaseStatusGroup) => {
      let adopted = 0;
      mutate(ids, (row) => {
        const override: CaseOverride = { status: statusForGroup(group) };
        if (group === "ASSIGNED" && row.ownerId === null) {
          // A case cannot sit in Assigned with nobody on it.
          override.ownerId = sessionUser.id;
          override.assignedAt = NOW_ISO;
          adopted += 1;
        }
        if (group === "VERIFIED") override.verifiedAt = NOW_ISO;
        if (group === "CLOSED") {
          override.verifiedAt = row.verifiedAt ?? NOW_ISO;
          override.closedAt = NOW_ISO;
        }
        return override;
      }, {
        kind: group === "CLOSED" ? "CASE_CLOSED" : "ASSIGNED",
        summary: `Moved ${pluralise(ids.length, "case")} to ${statusForGroup(group).replace("_", " ").toLowerCase()} from the board`,
      });
      pushNotice(
        "success",
        adopted > 0
          ? `${pluralise(ids.length, "case")} moved — ${pluralise(adopted, "case")} assigned to you.`
          : `${pluralise(ids.length, "case")} moved.`,
      );
    },
    [mutate, pushNotice, sessionUser.id],
  );

  const closeCases = React.useCallback(
    (ids: string[]) => {
      mutate(
        ids,
        (row) => ({
          status: "CLOSED",
          verifiedAt: row.verifiedAt ?? NOW_ISO,
          closedAt: NOW_ISO,
          // Closing from the queue is an administrative close, not a verified
          // outcome — it must not move anything into recovered revenue.
        }),
        {
          kind: ids.length > 1 ? "BULK_CLOSED" : "CASE_CLOSED",
          summary: `Closed ${pluralise(ids.length, "case")} from the queue`,
        },
      );
      clearSelection();
      pushNotice("success", `${pluralise(ids.length, "case")} closed.`);
    },
    [mutate, clearSelection, pushNotice],
  );

  const createCase = React.useCallback(
    (draft: NewCaseDraft) => {
      const lastCaseNo = allRowsRef.current.reduce(
        (highest, row) => (row.caseNo > highest ? row.caseNo : highest),
        "",
      );
      const created = buildCaseFromDraft(draft, {
        lastCaseNo,
        plants,
        users: assignableUsers,
        now: DEMO_NOW,
      });
      addCreatedCase(created, sessionUser);
      pushNotice("success", `${created.caseNo} created and scored ${created.priorityScore.toFixed(1)}.`);

      // The optimistic case above keeps the queue responsive. This is the one
      // that survives: the server scores the draft again, assigns the case
      // number from the tenant's own sequence, and writes it. The refresh
      // replaces the placeholder with the stored record — including its real
      // number, which the browser is in no position to choose.
      if (persistent) {
        void (async () => {
          const result = await createCaseAction(draft);
          if (!result.ok) pushNotice("info", `Not saved — ${result.error}`);
          router.refresh();
        })();
      }
      return created.caseNo;
    },
    [plants, assignableUsers, pushNotice, addCreatedCase, sessionUser, persistent, router],
  );

  const discardChanges = React.useCallback(() => {
    resetExecution();
    clearSelection();
    pushNotice("info", "Session changes discarded. Showing the stored case data.");
  }, [clearSelection, pushNotice, resetExecution]);

  const refresh = React.useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
    pushNotice("info", "Case data re-read from the operational store.");
  }, [router, pushNotice]);

  const exportVisible = React.useCallback(() => {
    const visible = visibleRowsRef.current;
    if (visible.length === 0) {
      pushNotice("info", "Nothing to export — no cases match the current filters.");
      return;
    }
    const filename = exportCasesCsv(visible);
    pushNotice("success", `Exported ${pluralise(visible.length, "case")} to ${filename}.`);
  }, [pushNotice]);

  return {
    filters,
    sort,
    view,
    rows,
    allRows,
    kpis,
    quickStats,
    chips,
    selectedIds,
    selectedRows,
    dirtyCount,
    isFiltered: chips.length > 0,
    isStale: deferredSearch !== filters.search,
    isRefreshing,
    notice,

    setSearch,
    toggleFilterValue,
    clearFilterField,
    removeChip,
    clearFilters,
    toggleKpi,
    toggleSort,
    setView,

    toggleRow,
    toggleAllVisible,
    clearSelection,

    assignCases,
    moveCases,
    closeCases,
    createCase,
    discardChanges,
    refresh,
    exportVisible,
    notify,
    dismissNotice,
  };
}

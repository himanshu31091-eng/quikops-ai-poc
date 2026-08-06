"use client";

import * as React from "react";
import type { FilterOption } from "@/components/patterns/filter-menu";
import type { ActionCenterData } from "@/src/data/queries/actions";
import type { ActionStatus, CorrectiveAction, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { useResetSignal } from "@/src/demo/use-demo-reset";
import { useExecutionStore } from "@/src/workflow/execution-store";
import {
  buildDeadlineGroups,
  buildFacets,
  buildFilterChips,
  computeKpis,
  filterActions,
  isFiltered,
  sortActions,
  toActionRow,
} from "../utils/action-derive";
import { exportActionsCsv } from "../utils/export-actions";
import {
  EMPTY_ACTION_FILTERS,
  UNASSIGNED_OWNER,
  type ActionFilterField,
  type ActionFilters,
  type ActionKpi,
  type ActionOverride,
  type ActionRow,
  type ActionScope,
  type ActionSort,
  type ActionSortKey,
  type ActiveFilterChip,
  type DeadlineGroup,
  type NewActionDraft,
} from "../types";

/**
 * The single owner of Action Center state.
 *
 * Components below this hook are presentational: they receive rows and
 * callbacks. Everything derived — rows, KPI counts, facets, chips, deadline
 * groups, the current page — is memoised from the same two inputs (server
 * actions plus session changes), so the header, the queue and the sidebar can
 * never disagree.
 *
 * Completing or reassigning an action publishes the outcome to the execution
 * store, so the Dashboard's activity feed and the case's own plan counters move
 * with it — without this module knowing either screen exists.
 */

const PAGE_SIZE = 12;
const NOTICE_TIMEOUT_MS = 6_000;

export interface ActionNotice {
  id: number;
  tone: "success" | "info";
  message: string;
}

export interface ActionCenterApi {
  filters: ActionFilters;
  sort: ActionSort;
  rows: ActionRow[];
  pageRows: ActionRow[];
  allRows: ActionRow[];
  kpis: ActionKpi[];
  facets: {
    plants: FilterOption[];
    priorities: FilterOption[];
    statuses: FilterOption[];
    owners: FilterOption[];
  };
  chips: ActiveFilterChip[];
  deadlines: DeadlineGroup[];
  selectedIds: Set<string>;
  selectedRows: ActionRow[];
  page: number;
  pageCount: number;
  isFiltered: boolean;
  isRefreshing: boolean;
  dirtyCount: number;
  notice: ActionNotice | null;
  /** The action whose drawer is open, kept in sync with session edits. */
  activeRow: ActionRow | null;

  setSearch: (value: string) => void;
  toggleFilterValue: (field: ActionFilterField, value: string) => void;
  clearFilterField: (field: ActionFilterField) => void;
  removeChip: (chipId: string) => void;
  clearFilters: () => void;
  setScope: (scope: ActionScope) => void;
  toggleSort: (key: ActionSortKey) => void;
  setPage: (page: number) => void;

  toggleRow: (id: string) => void;
  toggleAllVisible: () => void;
  clearSelection: () => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;

  completeActions: (ids: string[]) => void;
  assignActions: (ids: string[], userId: string) => void;
  setActionStatus: (id: string, status: ActionStatus) => void;
  escalateActions: (ids: string[]) => void;
  createAction: (draft: NewActionDraft) => void;
  applyRecommendation: (recommendationId: string) => void;
  refresh: () => void;
  exportVisible: () => void;
  notify: (message: string) => void;
  dismissNotice: () => void;
}

const NOW_ISO = DEMO_NOW.toISOString();
const DAY_MS = 86_400_000;

function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function useActionCenter(
  data: ActionCenterData,
  sessionUser: User,
): ActionCenterApi {
  const [filters, setFilters] = React.useState<ActionFilters>(EMPTY_ACTION_FILTERS);
  const [sort, setSort] = React.useState<ActionSort>({ key: "sla", direction: "asc" });
  const [overrides, setOverrides] = React.useState<Record<string, ActionOverride>>({});
  const [created, setCreated] = React.useState<CorrectiveAction[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [notice, setNotice] = React.useState<ActionNotice | null>(null);
  const noticeSeq = React.useRef(0);
  const createdSeq = React.useRef(0);

  const { recordOutcome } = useExecutionStore();

  // Demo reset clears the shared store; this drops the local session state with
  // it, so a reset restores the module rather than half of it.
  useResetSignal(
    React.useCallback(() => {
      setOverrides({});
      setCreated([]);
      setSelectedIds(new Set());
      setFilters(EMPTY_ACTION_FILTERS);
    }, []),
  );

  const userById = React.useMemo(
    () => Object.fromEntries(data.assignableUsers.map((user) => [user.id, user])),
    [data.assignableUsers],
  );

  const allRows = React.useMemo(() => {
    const source = created.length > 0 ? [...created, ...data.actions] : data.actions;
    return source
      .map((action) => {
        const context = data.contextByCaseNo[action.caseNo];
        if (!context) return null;
        return toActionRow(action, context, userById, overrides[action.id]);
      })
      .filter((row): row is ActionRow => row !== null);
  }, [data.actions, data.contextByCaseNo, created, overrides, userById]);

  const rows = React.useMemo(() => {
    const filtered = filterActions(allRows, filters, sessionUser.id);
    return sortActions(filtered, sort);
  }, [allRows, filters, sort, sessionUser.id]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = React.useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage],
  );

  const kpis = React.useMemo(
    () => computeKpis(allRows, filters, sessionUser.id),
    [allRows, filters, sessionUser.id],
  );

  const facets = React.useMemo(
    () => buildFacets(allRows, data.plants, data.assignableUsers),
    [allRows, data.plants, data.assignableUsers],
  );

  const chips = React.useMemo(
    () => buildFilterChips(filters, data.plants, data.assignableUsers),
    [filters, data.plants, data.assignableUsers],
  );

  const deadlines = React.useMemo(
    () => buildDeadlineGroups(allRows.filter((row) => row.isOpen)),
    [allRows],
  );

  const selectedRows = React.useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds],
  );

  const activeRow = React.useMemo(
    () => (activeId === null ? null : (allRows.find((row) => row.id === activeId) ?? null)),
    [activeId, allRows],
  );

  /* ------------------------------------------------------------- Notices */

  const notify = React.useCallback((message: string, tone: "success" | "info" = "info") => {
    noticeSeq.current += 1;
    setNotice({ id: noticeSeq.current, tone, message });
  }, []);

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const dismissNotice = React.useCallback(() => setNotice(null), []);

  /* -------------------------------------------------------------- Filters */

  const setSearch = React.useCallback((value: string) => {
    setFilters((previous) => ({ ...previous, search: value }));
    setPage(1);
  }, []);

  const toggleFilterValue = React.useCallback(
    (field: ActionFilterField, value: string) => {
      setFilters((previous) => {
        const current = previous[field] as string[];
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        return { ...previous, [field]: next };
      });
      setPage(1);
    },
    [],
  );

  const clearFilterField = React.useCallback((field: ActionFilterField) => {
    setFilters((previous) => ({ ...previous, [field]: [] }));
    setPage(1);
  }, []);

  const removeChip = React.useCallback((chipId: string) => {
    setPage(1);
    if (chipId === "search") {
      setFilters((previous) => ({ ...previous, search: "" }));
      return;
    }
    const [field, value] = chipId.split(":");
    if (!field || value === undefined) return;
    setFilters((previous) => {
      const current = previous[field as ActionFilterField] as string[];
      return { ...previous, [field]: current.filter((entry) => entry !== value) };
    });
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters(EMPTY_ACTION_FILTERS);
    setPage(1);
  }, []);

  const setScope = React.useCallback((scope: ActionScope) => {
    // Clicking the active tile clears it, so a tile is a toggle rather than a
    // one-way trip that needs a second control to undo.
    setFilters((previous) => ({
      ...previous,
      scope: previous.scope === scope ? "all" : scope,
    }));
    setPage(1);
  }, []);

  const toggleSort = React.useCallback((key: ActionSortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "due" || key === "sla" ? "asc" : "desc" },
    );
  }, []);

  /* ------------------------------------------------------------ Selection */

  const toggleRow = React.useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllVisible = React.useCallback(() => {
    setSelectedIds((previous) => {
      const visible = pageRows.map((row) => row.id);
      const allSelected = visible.every((id) => previous.has(id));
      const next = new Set(previous);
      for (const id of visible) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [pageRows]);

  const clearSelection = React.useCallback(() => setSelectedIds(new Set()), []);

  const openDrawer = React.useCallback((id: string) => setActiveId(id), []);
  const closeDrawer = React.useCallback(() => setActiveId(null), []);

  /* -------------------------------------------------------------- Outcomes */

  /**
   * Publishes plan progress for a case to the shared store. The Action Center
   * changes actions; the rest of the app cares about what that did to the case.
   */
  const publishCaseProgress = React.useCallback(
    (caseNos: string[], rowsAfter: ActionRow[], summary: string, actor: User) => {
      const unique = [...new Set(caseNos)];
      for (const caseNo of unique) {
        const caseActions = rowsAfter.filter((row) => row.caseNo === caseNo);
        recordOutcome({
          caseNo,
          patch: {
            actionsTotal: caseActions.length,
            actionsDone: caseActions.filter((row) => row.status === "DONE").length,
          },
          ...(unique.length === 1
            ? {
                event: {
                  kind: "ACTION_COMPLETED" as const,
                  summary,
                  actor,
                },
              }
            : {}),
        });
      }
      if (unique.length > 1) {
        recordOutcome({
          caseNo: unique[0]!,
          patch: {},
          event: { kind: "ACTION_COMPLETED", summary, actor },
        });
      }
    },
    [recordOutcome],
  );

  const completeActions = React.useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const targets = allRows.filter((row) => ids.includes(row.id) && row.isOpen);
      if (targets.length === 0) {
        notify("Those actions are already complete.");
        return;
      }

      setOverrides((previous) => {
        const next = { ...previous };
        for (const row of targets) {
          next[row.id] = {
            ...next[row.id],
            status: "DONE",
            completionPct: 100,
            completedAt: NOW_ISO,
          };
        }
        return next;
      });

      const after = allRows.map((row) =>
        targets.some((target) => target.id === row.id)
          ? { ...row, status: "DONE" as ActionStatus }
          : row,
      );
      publishCaseProgress(
        targets.map((row) => row.caseNo),
        after,
        targets.length === 1
          ? `Completed “${targets[0]!.title}” on ${targets[0]!.caseNo}`
          : `Completed ${pluralise(targets.length, "action")} across ${pluralise(
              new Set(targets.map((row) => row.caseNo)).size,
              "case",
            )}`,
        sessionUser,
      );

      setSelectedIds(new Set());
      notify(
        targets.length === 1
          ? `Completed “${targets[0]!.title}”.`
          : `Completed ${pluralise(targets.length, "action")}.`,
        "success",
      );
    },
    [allRows, notify, publishCaseProgress, sessionUser],
  );

  const assignActions = React.useCallback(
    (ids: string[], userId: string) => {
      if (ids.length === 0) return;
      const person = userById[userId];
      setOverrides((previous) => {
        const next = { ...previous };
        for (const id of ids) next[id] = { ...next[id], ownerId: userId };
        return next;
      });
      setSelectedIds(new Set());
      notify(
        `${pluralise(ids.length, "action")} reassigned to ${person?.name ?? "the new owner"}.`,
        "success",
      );
    },
    [notify, userById],
  );

  const setActionStatus = React.useCallback(
    (id: string, status: ActionStatus) => {
      const row = allRows.find((entry) => entry.id === id);
      if (!row) return;

      setOverrides((previous) => ({
        ...previous,
        [id]: {
          ...previous[id],
          status,
          ...(status === "DONE"
            ? { completionPct: 100, completedAt: NOW_ISO }
            : { completedAt: null }),
        },
      }));

      if (status === "DONE") {
        const after = allRows.map((entry) =>
          entry.id === id ? { ...entry, status } : entry,
        );
        publishCaseProgress(
          [row.caseNo],
          after,
          `Completed “${row.title}” on ${row.caseNo}`,
          sessionUser,
        );
      }
      notify(`Status set to ${status.replace("_", " ").toLowerCase()}.`, "success");
    },
    [allRows, notify, publishCaseProgress, sessionUser],
  );

  const escalateActions = React.useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const targets = allRows.filter((row) => ids.includes(row.id));
      // Escalation is a case-level state, so the action is marked blocked and
      // the case carries the escalation — the action is waiting on someone else
      // now, which is exactly what blocked means.
      setOverrides((previous) => {
        const next = { ...previous };
        for (const row of targets) next[row.id] = { ...next[row.id], status: "BLOCKED" };
        return next;
      });
      for (const caseNo of new Set(targets.map((row) => row.caseNo))) {
        recordOutcome({
          caseNo,
          patch: {},
          event: {
            kind: "ASSIGNED",
            summary: `Escalated ${caseNo} above the owner from the Action Center`,
            actor: sessionUser,
          },
        });
      }
      setSelectedIds(new Set());
      notify(`Escalated ${pluralise(targets.length, "action")}.`, "success");
    },
    [allRows, notify, recordOutcome, sessionUser],
  );

  const createAction = React.useCallback(
    (draft: NewActionDraft) => {
      const context = data.contextByCaseNo[draft.caseNo];
      if (!context) {
        notify("That case number does not exist.");
        return;
      }
      createdSeq.current += 1;
      const days = Number.parseInt(draft.dueInDays, 10);
      const action: CorrectiveAction = {
        id: `actn_session_${createdSeq.current}`,
        caseId: `case_${draft.caseNo.replace(/-/g, "_").toLowerCase()}`,
        caseNo: draft.caseNo,
        caseTitle: context.caseTitle,
        title: draft.title.trim(),
        description: draft.description.trim(),
        ownerId: draft.ownerId,
        status: "TODO",
        origin: "MANUAL",
        dueAt: new Date(
          DEMO_NOW.getTime() + (Number.isFinite(days) ? days : 3) * DAY_MS,
        ).toISOString(),
        completedAt: null,
        priorityBand: context.priorityBand,
        plantCode: context.plantCode,
        completionPct: 0,
        notes: "",
        evidenceCount: 0,
      };
      setCreated((previous) => [action, ...previous]);
      notify(`Action created on ${draft.caseNo}.`, "success");
    },
    [data.contextByCaseNo, notify],
  );

  const applyRecommendation = React.useCallback(
    (recommendationId: string) => {
      const recommendation = data.recommendations.find(
        (entry) => entry.id === recommendationId,
      );
      if (!recommendation) return;
      const context = data.contextByCaseNo[recommendation.caseNo];
      if (!context) return;

      createdSeq.current += 1;
      const action: CorrectiveAction = {
        id: `actn_rec_${createdSeq.current}`,
        caseId: `case_${recommendation.caseNo.replace(/-/g, "_").toLowerCase()}`,
        caseNo: recommendation.caseNo,
        caseTitle: context.caseTitle,
        title: recommendation.actionTitle,
        description: recommendation.actionDescription,
        ownerId: context.ownerId ?? sessionUser.id,
        status: "TODO",
        origin: "AI_SUGGESTED",
        // Recommendations are the thing to do next, so they land at the front
        // of the queue rather than at the end of the plan.
        dueAt: new Date(DEMO_NOW.getTime() + DAY_MS).toISOString(),
        completedAt: null,
        priorityBand: context.priorityBand,
        plantCode: context.plantCode,
        completionPct: 0,
        notes: `Applied from an AI recommendation at ${recommendation.confidence.score}% confidence.`,
        evidenceCount: 0,
      };
      setCreated((previous) => [action, ...previous]);
      recordOutcome({
        caseNo: recommendation.caseNo,
        patch: {},
        event: {
          kind: "ACTION_COMPLETED",
          summary: `Applied AI recommendation on ${recommendation.caseNo} — ${recommendation.headline.toLowerCase()}`,
          actor: sessionUser,
        },
      });
      notify(`Recommendation applied to ${recommendation.caseNo}.`, "success");
    },
    [data.contextByCaseNo, data.recommendations, notify, recordOutcome, sessionUser],
  );

  const refresh = React.useCallback(() => {
    setIsRefreshing(true);
    setOverrides({});
    setCreated([]);
    setSelectedIds(new Set());
    window.setTimeout(() => {
      setIsRefreshing(false);
      notify("Reloaded from the action store. Session changes discarded.");
    }, 420);
  }, [notify]);

  const exportVisible = React.useCallback(() => {
    const filename = exportActionsCsv(rows);
    notify(`Exported ${filename}`, "success");
  }, [rows, notify]);

  const dirtyCount = Object.keys(overrides).length + created.length;

  return {
    filters,
    sort,
    rows,
    pageRows,
    allRows,
    kpis,
    facets,
    chips,
    deadlines,
    selectedIds,
    selectedRows,
    page: safePage,
    pageCount,
    isFiltered: isFiltered(filters),
    isRefreshing,
    dirtyCount,
    notice,
    activeRow,
    setSearch,
    toggleFilterValue,
    clearFilterField,
    removeChip,
    clearFilters,
    setScope,
    toggleSort,
    setPage,
    toggleRow,
    toggleAllVisible,
    clearSelection,
    openDrawer,
    closeDrawer,
    completeActions,
    assignActions,
    setActionStatus,
    escalateActions,
    createAction,
    applyRecommendation,
    refresh,
    exportVisible,
    notify,
    dismissNotice,
  };
}

export { UNASSIGNED_OWNER };

"use client";

import * as React from "react";
import type { FilterOption } from "@/components/patterns/filter-menu";
import { CONNECTOR_STATUS_META } from "@/src/domain/connector-health";
import type { ConnectorStatus, User } from "@/src/domain/types";
import type { ConnectorHealthData } from "@/src/data/queries/connectors";
import type { ConnectorRun } from "@/src/data/fixtures/connectors";
import { useResetSignal } from "@/src/demo/use-demo-reset";
import { useExecutionStore } from "@/src/workflow/execution-store";
import {
  buildKpiTiles,
  buildTrends,
  filterConnectors,
  filterRuns,
  isFiltered,
  toDeadLetterRow,
} from "../utils/connector-derive";
import {
  EMPTY_CONNECTOR_FILTERS,
  type ConnectorFilterField,
  type ConnectorFilters,
  type ConnectorHealthModel,
  type ConnectorScope,
} from "../types";

/**
 * The single owner of Connector Health state.
 *
 * Components below this hook are presentational. Everything derived — the KPI
 * tiles, the cards, the funnel, the dead-letter queue, the run history and the
 * trends — is memoised from the same two inputs (server data plus this
 * session's replays), so no two panels can disagree.
 *
 * Replaying a message publishes a workflow event, so the dashboard's activity
 * feed shows the intervention without this module knowing that screen exists.
 */

const NOTICE_TIMEOUT_MS = 6_000;

export interface ConnectorNotice {
  id: number;
  tone: "success" | "info";
  message: string;
}

export interface ConnectorHealthApi {
  filters: ConnectorFilters;
  model: ConnectorHealthModel;
  runs: ConnectorRun[];
  facets: { connectorIds: FilterOption[]; statuses: FilterOption[] };
  selectedId: string | null;
  notice: ConnectorNotice | null;
  isRefreshing: boolean;
  replayedCount: number;

  setSearch: (value: string) => void;
  setScope: (scope: ConnectorScope) => void;
  toggleFilterValue: (field: ConnectorFilterField, value: string) => void;
  clearFilterField: (field: ConnectorFilterField) => void;
  clearFilters: () => void;
  selectConnector: (id: string | null) => void;
  replayMessage: (id: string) => void;
  replayAll: (ids: string[]) => void;
  refresh: () => void;
  /** Surfaces a confirmation in the module toast — used by the export. */
  notify: (message: string, tone?: "success" | "info") => void;
  dismissNotice: () => void;
}

export function useConnectorHealth(
  data: ConnectorHealthData,
  sessionUser: User,
): ConnectorHealthApi {
  const [filters, setFilters] = React.useState<ConnectorFilters>(EMPTY_CONNECTOR_FILTERS);
  const [replayedIds, setReplayedIds] = React.useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [notice, setNotice] = React.useState<ConnectorNotice | null>(null);
  const noticeSeq = React.useRef(0);

  const { recordOutcome } = useExecutionStore();

  // Cleared alongside the shared store on demo reset.
  useResetSignal(
    React.useCallback(() => {
      setReplayedIds(new Set());
      setFilters(EMPTY_CONNECTOR_FILTERS);
      setSelectedId(null);
    }, []),
  );

  const notify = React.useCallback(
    (message: string, tone: "success" | "info" = "info") => {
      noticeSeq.current += 1;
      setNotice({ id: noticeSeq.current, tone, message });
    },
    [],
  );

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const deadLetter = React.useMemo(
    () =>
      data.deadLetter.map((message) =>
        toDeadLetterRow(message, data.connectors, replayedIds),
      ),
    [data.deadLetter, data.connectors, replayedIds],
  );

  const openDeadLetterByConnector = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of deadLetter) {
      if (row.isReplayed) continue;
      counts[row.connectorId] = (counts[row.connectorId] ?? 0) + 1;
    }
    return counts;
  }, [deadLetter]);

  const openDeadLetterDepth = deadLetter.filter((row) => !row.isReplayed).length;

  const model = React.useMemo<ConnectorHealthModel>(() => {
    const visible = filterConnectors(data.connectors, filters, openDeadLetterByConnector);
    return {
      connectors: data.connectors,
      visibleConnectors: visible,
      kpis: buildKpiTiles(
        data.connectors,
        openDeadLetterDepth,
        data.kpis.casesRaised,
        filters,
      ),
      funnel: data.funnel,
      deadLetter,
      trends: buildTrends(visible, data.runs),
      openDeadLetterDepth,
      isFiltered: isFiltered(filters),
    };
  }, [
    data.connectors,
    data.funnel,
    data.runs,
    data.kpis.casesRaised,
    filters,
    deadLetter,
    openDeadLetterByConnector,
    openDeadLetterDepth,
  ]);

  const runs = React.useMemo(
    () =>
      filterRuns(
        data.runs,
        filters,
        new Set(model.visibleConnectors.map((connector) => connector.id)),
      ),
    [data.runs, filters, model.visibleConnectors],
  );

  const facets = React.useMemo(() => {
    const statuses: ConnectorStatus[] = ["SUCCESS", "PARTIAL", "FAILED", "RUNNING"];
    return {
      connectorIds: data.connectors.map((connector) => ({
        value: connector.id,
        label: connector.name,
        hint: connector.system,
        count: data.runs.filter((run) => run.connectorId === connector.id).length,
      })),
      statuses: statuses
        .map((status) => ({
          value: status,
          label: CONNECTOR_STATUS_META[status].label,
          count: data.runs.filter((run) => run.status === status).length,
          dotClassName: CONNECTOR_STATUS_META[status].dotClassName,
        }))
        .filter((option) => option.count > 0),
    };
  }, [data.connectors, data.runs]);

  /* ------------------------------------------------------------- Filters */

  const setSearch = React.useCallback((value: string) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const setScope = React.useCallback((scope: ConnectorScope) => {
    // Clicking the active tile clears it, so a tile is a toggle rather than a
    // one-way trip needing a second control to undo.
    setFilters((previous) => ({
      ...previous,
      scope: previous.scope === scope ? "all" : scope,
    }));
  }, []);

  const toggleFilterValue = React.useCallback(
    (field: ConnectorFilterField, value: string) => {
      setFilters((previous) => {
        const current = previous[field] as string[];
        return {
          ...previous,
          [field]: current.includes(value)
            ? current.filter((entry) => entry !== value)
            : [...current, value],
        };
      });
    },
    [],
  );

  const clearFilterField = React.useCallback((field: ConnectorFilterField) => {
    setFilters((previous) => ({ ...previous, [field]: [] }));
  }, []);

  const clearFilters = React.useCallback(() => setFilters(EMPTY_CONNECTOR_FILTERS), []);

  const selectConnector = React.useCallback(
    (id: string | null) => setSelectedId(id),
    [],
  );

  /* ------------------------------------------------------------- Replay */

  const replayMessage = React.useCallback(
    (id: string) => {
      const row = deadLetter.find((entry) => entry.id === id);
      if (!row || row.isReplayed) return;
      if (row.isUnreplayable) {
        notify(
          `${row.reasonLabel} cannot be resolved by a replay — the upstream contract has to change first.`,
        );
        return;
      }

      setReplayedIds((previous) => new Set(previous).add(id));
      recordOutcome({
        caseNo: row.signalRef,
        patch: {},
        event: {
          kind: "ASSIGNED",
          summary: `Replayed ${row.signalRef} from the ${row.connectorName} dead-letter queue`,
          actor: sessionUser,
        },
      });
      notify(`Replayed ${row.signalRef}. It will be picked up by the next run.`, "success");
    },
    [deadLetter, notify, recordOutcome, sessionUser],
  );

  const replayAll = React.useCallback(
    (ids: string[]) => {
      const targets = deadLetter.filter(
        (row) => ids.includes(row.id) && !row.isReplayed && !row.isUnreplayable,
      );
      if (targets.length === 0) {
        notify("Nothing in that selection can be replayed.");
        return;
      }
      setReplayedIds((previous) => {
        const next = new Set(previous);
        for (const row of targets) next.add(row.id);
        return next;
      });
      recordOutcome({
        caseNo: targets[0]!.signalRef,
        patch: {},
        event: {
          kind: "ASSIGNED",
          summary: `Replayed ${targets.length} dead-letter message${targets.length === 1 ? "" : "s"} from the ingestion queue`,
          actor: sessionUser,
        },
      });
      notify(
        `Replayed ${targets.length} message${targets.length === 1 ? "" : "s"}.`,
        "success",
      );
    },
    [deadLetter, notify, recordOutcome, sessionUser],
  );

  const refresh = React.useCallback(() => {
    setIsRefreshing(true);
    setReplayedIds(new Set());
    window.setTimeout(() => {
      setIsRefreshing(false);
      notify("Reloaded connector state. Session replays discarded.");
    }, 420);
  }, [notify]);

  const dismissNotice = React.useCallback(() => setNotice(null), []);

  return {
    filters,
    model,
    runs,
    facets,
    selectedId,
    notice,
    isRefreshing,
    replayedCount: replayedIds.size,
    setSearch,
    setScope,
    toggleFilterValue,
    clearFilterField,
    clearFilters,
    selectConnector,
    replayMessage,
    replayAll,
    refresh,
    notify,
    dismissNotice,
  };
}

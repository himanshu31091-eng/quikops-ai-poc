"use client";

import * as React from "react";
import type { FilterOption } from "@/components/patterns/filter-menu";
import type { ToolbarChip } from "@/components/patterns/module-toolbar";
import type { KpiTileModel } from "@/components/patterns/kpi-tile";
import type { AuditEntryRow, AuditLogData } from "@/src/data/queries/audit";
import { AUDIT_SOURCE_LABEL, ROLE_META } from "@/src/config/app-config";
import type { CaseAuditEntry } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { exportTableCsv, type CsvColumn } from "@/src/lib/export";
import { useTableState } from "@/src/hooks/use-table-state";
import { useExecutionStore } from "@/src/workflow/execution-store";
import { formatNumber, formatTimestamp } from "@/src/lib/format";

/**
 * The single owner of Audit Log state.
 *
 * Session entries from the execution store interleave chronologically with the
 * stored ones rather than sitting in a separate section — an audit log with two
 * timelines is not an audit log.
 */

export type AuditSortKey = "at" | "actor" | "action" | "case" | "source";
export type AuditFilterField = "actors" | "sources" | "actions" | "plants";

export interface AuditFilters {
  search: string;
  actors: string[];
  sources: string[];
  actions: string[];
  plants: string[];
}

const EMPTY_FILTERS: AuditFilters = {
  search: "",
  actors: [],
  sources: [],
  actions: [],
  plants: [],
};

const DAY_MS = 86_400_000;

const CSV_COLUMNS: CsvColumn<AuditEntryRow>[] = [
  { header: "Timestamp", value: (row) => formatTimestamp(row.at) },
  { header: "Actor", value: (row) => row.actorName },
  { header: "Role", value: (row) => (row.actorRole ? ROLE_META[row.actorRole].label : "System") },
  { header: "Action", value: (row) => row.action },
  { header: "Case", value: (row) => row.caseNo },
  { header: "Case title", value: (row) => row.caseTitle },
  { header: "Plant", value: (row) => row.plantName },
  { header: "Field", value: (row) => row.field ?? "" },
  { header: "From", value: (row) => row.fromValue ?? "" },
  { header: "To", value: (row) => row.toValue ?? "" },
  { header: "Source", value: (row) => AUDIT_SOURCE_LABEL[row.source] },
];

export function useAuditLog(data: AuditLogData) {
  const [filters, setFilters] = React.useState<AuditFilters>(EMPTY_FILTERS);
  const [notice, setNotice] = React.useState<string | null>(null);
  const { state } = useExecutionStore();

  /** Session events, shaped as audit rows so they sort into the same list. */
  const sessionEntries = React.useMemo<AuditEntryRow[]>(
    () =>
      state.events.map((event) => ({
        id: event.id,
        at: event.at,
        actorId: null,
        actorName: event.actorName,
        actorRole: event.actorRole,
        action: event.kind.replace(/_/g, " ").toLowerCase(),
        field: null,
        fromValue: null,
        toValue: null,
        source: "CASE_DETAIL" as const,
        caseNo: event.caseNo ?? "—",
        caseTitle: event.summary,
        plantCode: "—",
        plantName: "This session",
      })),
    [state.events],
  );

  const allEntries = React.useMemo(
    () =>
      [...sessionEntries, ...data.entries].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      ),
    [sessionEntries, data.entries],
  );

  const filtered = React.useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return allEntries.filter((entry) => {
      if (filters.actors.length > 0 && !filters.actors.includes(entry.actorName)) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(entry.source)) return false;
      if (filters.actions.length > 0 && !filters.actions.includes(entry.action)) return false;
      if (filters.plants.length > 0 && !filters.plants.includes(entry.plantCode)) return false;
      if (needle === "") return true;
      return `${entry.actorName} ${entry.action} ${entry.caseNo} ${entry.caseTitle} ${entry.field ?? ""} ${entry.toValue ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [allEntries, filters]);

  const resetKey = JSON.stringify(filters);
  const table = useTableState<AuditSortKey>({
    initialSort: { key: "at", direction: "desc" },
    ascendingFirst: ["actor", "action", "case", "source"],
    pageSize: 15,
    totalRows: filtered.length,
    resetKey,
  });

  const sorted = React.useMemo(() => {
    const direction = table.sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const compare = (() => {
        switch (table.sort.key) {
          case "actor":
            return a.actorName.localeCompare(b.actorName);
          case "action":
            return a.action.localeCompare(b.action);
          case "case":
            return a.caseNo.localeCompare(b.caseNo);
          case "source":
            return a.source.localeCompare(b.source);
          default:
            return new Date(a.at).getTime() - new Date(b.at).getTime();
        }
      })();
      return compare * direction || a.id.localeCompare(b.id);
    });
  }, [filtered, table.sort]);

  const pageRows = table.paginate(sorted);

  const facets = React.useMemo(() => {
    const count = (predicate: (entry: AuditEntryRow) => boolean): number =>
      allEntries.filter(predicate).length;

    const actorNames = [...new Set(allEntries.map((entry) => entry.actorName))].sort();
    const sources = [...new Set(allEntries.map((entry) => entry.source))].sort();

    return {
      actors: actorNames.map<FilterOption>((name) => ({
        value: name,
        label: name,
        count: count((entry) => entry.actorName === name),
      })),
      sources: sources.map<FilterOption>((source) => ({
        value: source,
        label: AUDIT_SOURCE_LABEL[source].toLowerCase(),
        count: count((entry) => entry.source === source),
      })),
      actions: data.actions.map<FilterOption>((action) => ({
        value: action,
        label: action,
        count: count((entry) => entry.action === action),
      })),
      plants: data.plants.map<FilterOption>((plant) => ({
        value: plant.code,
        label: plant.name,
        hint: plant.country,
        count: count((entry) => entry.plantCode === plant.code),
      })),
    };
  }, [allEntries, data.actions, data.plants]);

  const kpis = React.useMemo<KpiTileModel[]>(() => {
    const last24h = allEntries.filter(
      (entry) => DEMO_NOW.getTime() - new Date(entry.at).getTime() < DAY_MS,
    ).length;
    const actors = new Set(allEntries.map((entry) => entry.actorName)).size;
    const automated = allEntries.filter(
      (entry) => entry.source === "EVERY_ANGLE" || entry.source === "RULE_ENGINE",
    ).length;

    return [
      {
        key: "total",
        label: "Audit entries",
        value: allEntries.length,
        format: "count",
        footnote: `Across ${new Set(allEntries.map((e) => e.caseNo)).size} cases`,
        icon: "ScrollText",
        tone: "neutral",
      },
      {
        key: "recent",
        label: "Last 24 hours",
        value: last24h,
        format: "count",
        footnote: "Changes recorded since yesterday",
        icon: "Clock",
        tone: "accent",
      },
      {
        key: "actors",
        label: "Distinct actors",
        value: actors,
        format: "count",
        footnote: "People and systems that made a change",
        icon: "Users",
        tone: "neutral",
      },
      {
        key: "automated",
        label: "Machine-recorded",
        value: automated,
        format: "count",
        footnote: `${formatNumber(Math.round((automated / Math.max(allEntries.length, 1)) * 100))}% of all entries`,
        icon: "PlugZap",
        tone: "success",
      },
    ];
  }, [allEntries]);

  const chips = React.useMemo<ToolbarChip[]>(() => {
    const out: ToolbarChip[] = [];
    if (filters.search.trim() !== "") {
      out.push({ id: "search", group: "Search", label: `“${filters.search.trim()}”` });
    }
    for (const value of filters.actors) out.push({ id: `actors:${value}`, group: "Actor", label: value });
    for (const value of filters.sources) {
      out.push({
        id: `sources:${value}`,
        group: "Source",
        label: (AUDIT_SOURCE_LABEL[value as CaseAuditEntry["source"]] ?? value).toLowerCase(),
      });
    }
    for (const value of filters.actions) out.push({ id: `actions:${value}`, group: "Action", label: value });
    for (const value of filters.plants) {
      out.push({
        id: `plants:${value}`,
        group: "Plant",
        label: data.plants.find((p) => p.code === value)?.name ?? value,
      });
    }
    return out;
  }, [filters, data.plants]);

  const isFiltered =
    filters.search.trim() !== "" ||
    filters.actors.length > 0 ||
    filters.sources.length > 0 ||
    filters.actions.length > 0 ||
    filters.plants.length > 0;

  const setSearch = React.useCallback((value: string) => {
    setFilters((previous) => ({ ...previous, search: value }));
  }, []);

  const toggleFilterValue = React.useCallback((field: AuditFilterField, value: string) => {
    setFilters((previous) => {
      const current = previous[field];
      return {
        ...previous,
        [field]: current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value],
      };
    });
  }, []);

  const clearFilterField = React.useCallback((field: AuditFilterField) => {
    setFilters((previous) => ({ ...previous, [field]: [] }));
  }, []);

  const removeChip = React.useCallback((id: string) => {
    if (id === "search") {
      setFilters((previous) => ({ ...previous, search: "" }));
      return;
    }
    const [field, value] = id.split(":");
    if (!field || value === undefined) return;
    setFilters((previous) => ({
      ...previous,
      [field]: (previous[field as AuditFilterField] as string[]).filter((e) => e !== value),
    }));
  }, []);

  const clearFilters = React.useCallback(() => setFilters(EMPTY_FILTERS), []);

  const exportCsv = React.useCallback(() => {
    const filename = exportTableCsv({
      moduleSlug: "audit-log",
      rows: sorted,
      columns: CSV_COLUMNS,
    });
    setNotice(`Exported ${filename}`);
  }, [sorted]);

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return {
    filters,
    facets,
    chips,
    kpis,
    isFiltered,
    rows: sorted,
    pageRows,
    table,
    notice,
    sessionCount: sessionEntries.length,
    setSearch,
    toggleFilterValue,
    clearFilterField,
    removeChip,
    clearFilters,
    exportCsv,
    dismissNotice: () => setNotice(null),
  };
}

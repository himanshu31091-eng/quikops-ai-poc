import { DETECTION_SOURCE_META, EXCEPTION_META, PRIORITY_META } from "@/src/config/app-config";
import { CASE_STATUS_GROUPS, STATUS_GROUP_META } from "@/src/domain/case-status";
import { SLA_TARGET_HOURS } from "@/src/domain/sla";
import type { Plant, User } from "@/src/domain/types";
import type {
  ActiveFilterChip,
  SortKey,
  WorkCaseRow,
  WorkFilters,
  WorkKpi,
  WorkQuickStats,
  WorkSort,
} from "../types";
import { UNASSIGNED_OWNER } from "../types";
import {
  KPI_KEY_LABELS,
  KPI_ORDER,
  KPI_PRESETS,
  REVENUE_BAND_META,
} from "./filter-definitions";

/**
 * Pure query layer for the client. Nothing here touches React, so the whole
 * filter/sort/aggregate path is trivially testable and can be memoised as a
 * single unit inside the hook.
 */

/* -------------------------------------------------------------------- Search */

export function tokenise(search: string): string[] {
  return search.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesSearch(row: WorkCaseRow, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) => row.haystack.includes(token));
}

/* ------------------------------------------------------------------ Filtering */

interface FilterContext {
  sessionUserId: string;
  tokens: string[];
}

export function matchesFilters(
  row: WorkCaseRow,
  filters: WorkFilters,
  { sessionUserId, tokens }: FilterContext,
): boolean {
  if (!matchesSearch(row, tokens)) return false;
  if (filters.plants.length > 0 && !filters.plants.includes(row.plantCode)) return false;
  if (filters.priorities.length > 0 && !filters.priorities.includes(row.priorityBand)) {
    return false;
  }
  if (filters.statusGroups.length > 0 && !filters.statusGroups.includes(row.statusGroup)) {
    return false;
  }
  if (filters.categories.length > 0 && !filters.categories.includes(row.exceptionType)) {
    return false;
  }
  if (filters.revenueBands.length > 0 && !filters.revenueBands.includes(row.revenueBand)) {
    return false;
  }
  if (filters.owners.length > 0) {
    const key = row.ownerId ?? UNASSIGNED_OWNER;
    if (!filters.owners.includes(key)) return false;
  }
  if (filters.detectedBy.length > 0 && !filters.detectedBy.includes(row.detectedBy)) {
    return false;
  }
  if (filters.kpi !== null && row.kpiKey !== filters.kpi) return false;
  if (filters.overdueOnly && !row.isOverdue) return false;
  if (filters.mineOnly && row.ownerId !== sessionUserId) return false;
  if (filters.completedToday && !row.completedToday) return false;
  return true;
}

export function filterRows(
  rows: WorkCaseRow[],
  filters: WorkFilters,
  sessionUserId: string,
): WorkCaseRow[] {
  const context: FilterContext = { sessionUserId, tokens: tokenise(filters.search) };
  return rows.filter((row) => matchesFilters(row, filters, context));
}

/* -------------------------------------------------------------------- Sorting */

const STATUS_GROUP_ORDER = new Map(CASE_STATUS_GROUPS.map((group, index) => [group, index]));

/** Unassigned sorts last ascending — an owner column should not open with blanks. */
const OWNER_LAST = "￿";

function compareBy(key: SortKey, a: WorkCaseRow, b: WorkCaseRow): number {
  switch (key) {
    case "priority":
      return a.priorityScore - b.priorityScore;
    case "caseNo":
      return a.caseNo.localeCompare(b.caseNo);
    case "title":
      return a.title.localeCompare(b.title);
    case "plant":
      return a.plantCode.localeCompare(b.plantCode);
    case "category":
      return EXCEPTION_META[a.exceptionType].label.localeCompare(
        EXCEPTION_META[b.exceptionType].label,
      );
    case "status":
      return (
        (STATUS_GROUP_ORDER.get(a.statusGroup) ?? 0) -
        (STATUS_GROUP_ORDER.get(b.statusGroup) ?? 0)
      );
    case "owner":
      return (a.owner?.name ?? OWNER_LAST).localeCompare(b.owner?.name ?? OWNER_LAST);
    case "revenue":
      return a.revenueAtRisk - b.revenueAtRisk;
    case "due":
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    case "age":
      return a.ageDays - b.ageDays;
    case "detected":
      return (
        new Date(a.lastDetectedAt).getTime() - new Date(b.lastDetectedAt).getTime()
      );
  }
}

export function sortRows(rows: WorkCaseRow[], sort: WorkSort): WorkCaseRow[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = compareBy(sort.key, a, b) * factor;
    if (primary !== 0) return primary;
    // Deterministic tie-break: the same query always produces the same order.
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.caseNo.localeCompare(a.caseNo);
  });
}

/* ----------------------------------------------------------------- KPI header */

export function computeKpis(
  rows: WorkCaseRow[],
  filters: WorkFilters,
  sessionUserId: string,
): WorkKpi[] {
  const open = rows.filter((row) => row.isOpen);
  const unassignedOpen = open.filter((row) => row.ownerId === null);
  const mine = open.filter((row) => row.ownerId === sessionUserId);
  const mineOverdue = mine.filter((row) => row.isOverdue);
  const overdue = open.filter((row) => row.isOverdue);
  const overdueCritical = overdue.filter((row) => row.priorityBand === "CRITICAL");
  const verification = rows.filter((row) => row.statusGroup === "WAITING_VERIFICATION");
  const verificationOverdue = verification.filter((row) => row.isOverdue);
  const completed = rows.filter((row) => row.completedToday);
  const verifiedToday = completed.filter((row) => row.statusGroup === "VERIFIED").length;
  const closedToday = completed.length - verifiedToday;

  const counts: Record<WorkKpi["key"], { value: number; footnote: string }> = {
    open: {
      value: open.length,
      footnote:
        unassignedOpen.length > 0
          ? `${unassignedOpen.length} still unassigned`
          : "Every open case has an owner",
    },
    mine: {
      value: mine.length,
      footnote:
        mine.length === 0
          ? "Nothing routed to you"
          : mineOverdue.length > 0
            ? `${mineOverdue.length} past SLA`
            : "All within SLA",
    },
    overdue: {
      value: overdue.length,
      footnote:
        overdue.length === 0
          ? "No SLA breaches open"
          : `${overdueCritical.length} of them critical`,
    },
    verification: {
      value: verification.length,
      footnote:
        verificationOverdue.length > 0
          ? `${verificationOverdue.length} waiting past SLA`
          : "Awaiting manager sign-off",
    },
    completed: {
      value: completed.length,
      footnote:
        completed.length === 0
          ? "Nothing signed off yet today"
          : `${verifiedToday} verified · ${closedToday} closed`,
    },
  };

  return KPI_ORDER.map((key) => {
    const preset = KPI_PRESETS[key];
    return {
      key,
      label: preset.label,
      icon: preset.icon,
      tone: preset.tone,
      active: preset.isActive(filters),
      value: counts[key].value,
      footnote: counts[key].footnote,
    };
  });
}

/* ---------------------------------------------------------------- Quick stats */

export function computeQuickStats(
  visible: WorkCaseRow[],
  all: WorkCaseRow[],
): WorkQuickStats {
  const openVisible = visible.filter((row) => row.isOpen);
  const revenueAtRisk = openVisible.reduce((sum, row) => sum + row.revenueAtRisk, 0);
  const portfolioRisk = all
    .filter((row) => row.isOpen)
    .reduce((sum, row) => sum + row.revenueAtRisk, 0);

  const critical = openVisible.filter((row) => row.priorityBand === "CRITICAL");
  const resolved = visible.filter(
    (row): row is WorkCaseRow & { resolutionHours: number } => row.resolutionHours !== null,
  );

  // Raw hours are not comparable across bands — a low-priority case has a 30-day
  // SLA and a critical one has 24 hours. Measuring each case against its own
  // target is the only average that means anything across a mixed set.
  const slaUsage =
    resolved.length > 0
      ? resolved.reduce(
          (sum, row) => sum + row.resolutionHours / SLA_TARGET_HOURS[row.priorityBand],
          0,
        ) / resolved.length
      : null;

  return {
    revenueAtRisk,
    revenueAtRiskSharePct:
      portfolioRisk > 0 ? Math.round((revenueAtRisk / portfolioRisk) * 1000) / 10 : 0,
    criticalCount: critical.length,
    criticalRevenueAtRisk: critical.reduce((sum, row) => sum + row.revenueAtRisk, 0),
    unassignedCriticalCount: critical.filter((row) => row.ownerId === null).length,
    averageResolutionHours:
      resolved.length > 0
        ? Math.round(
            (resolved.reduce((sum, row) => sum + row.resolutionHours, 0) / resolved.length) *
              10,
          ) / 10
        : null,
    averageSlaUsagePct: slaUsage === null ? null : Math.round(slaUsage * 1000) / 10,
    resolvedSampleSize: resolved.length,
    overdueCount: openVisible.filter((row) => row.isOverdue).length,
    slaAtRiskCount: openVisible.filter((row) => !row.isOverdue && row.dueInDays <= 1).length,
  };
}

/* --------------------------------------------------------------- Filter chips */

export interface ChipContext {
  plants: Plant[];
  users: User[];
  sessionUser: User;
}

export function buildFilterChips(
  filters: WorkFilters,
  { plants, users, sessionUser }: ChipContext,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  const plantName = (code: string) =>
    plants.find((plant) => plant.code === code)?.name ?? code;
  const userName = (id: string) =>
    id === UNASSIGNED_OWNER
      ? "Unassigned"
      : (users.find((user) => user.id === id)?.name ?? id);

  if (filters.search.trim() !== "") {
    chips.push({ id: "search", group: "Search", label: `“${filters.search.trim()}”` });
  }
  filters.plants.forEach((code) =>
    chips.push({ id: `plants:${code}`, group: "Plant", label: `${code} · ${plantName(code)}` }),
  );
  filters.priorities.forEach((band) =>
    chips.push({
      id: `priorities:${band}`,
      group: "Priority",
      label: PRIORITY_META[band].label,
    }),
  );
  filters.statusGroups.forEach((group) =>
    chips.push({
      id: `statusGroups:${group}`,
      group: "Status",
      label: STATUS_GROUP_META[group].label,
    }),
  );
  filters.categories.forEach((type) =>
    chips.push({
      id: `categories:${type}`,
      group: "Category",
      label: EXCEPTION_META[type].label,
    }),
  );
  filters.revenueBands.forEach((band) =>
    chips.push({
      id: `revenueBands:${band}`,
      group: "Revenue impact",
      label: REVENUE_BAND_META[band].label,
    }),
  );
  filters.owners.forEach((id) =>
    chips.push({ id: `owners:${id}`, group: "Owner", label: userName(id) }),
  );
  filters.detectedBy.forEach((source) =>
    chips.push({
      id: `detectedBy:${source}`,
      group: "Detected by",
      label: DETECTION_SOURCE_META[source].label,
    }),
  );
  if (filters.kpi !== null) {
    chips.push({
      id: "kpi",
      group: "Measured KPI",
      label: KPI_KEY_LABELS[filters.kpi],
    });
  }
  if (filters.overdueOnly) {
    chips.push({ id: "overdueOnly", group: "SLA", label: "Overdue only" });
  }
  if (filters.mineOnly) {
    chips.push({ id: "mineOnly", group: "Owner", label: `Assigned to ${sessionUser.name}` });
  }
  if (filters.completedToday) {
    chips.push({ id: "completedToday", group: "Outcome", label: "Completed today" });
  }
  return chips;
}

const ARRAY_FIELDS = [
  "plants",
  "priorities",
  "statusGroups",
  "categories",
  "revenueBands",
  "owners",
  "detectedBy",
] as const;

type ArrayField = (typeof ARRAY_FIELDS)[number];

function isArrayField(value: string): value is ArrayField {
  return (ARRAY_FIELDS as readonly string[]).includes(value);
}

/** Removes exactly the value a chip represents, leaving every other filter intact. */
export function removeFilterChip(filters: WorkFilters, chipId: string): WorkFilters {
  if (chipId === "search") return { ...filters, search: "" };
  if (chipId === "kpi") return { ...filters, kpi: null };
  if (chipId === "overdueOnly") return { ...filters, overdueOnly: false };
  if (chipId === "mineOnly") return { ...filters, mineOnly: false };
  if (chipId === "completedToday") return { ...filters, completedToday: false };

  const separator = chipId.indexOf(":");
  if (separator === -1) return filters;
  const field = chipId.slice(0, separator);
  const value = chipId.slice(separator + 1);
  if (!isArrayField(field)) return filters;

  return {
    ...filters,
    [field]: (filters[field] as string[]).filter((entry) => entry !== value),
  };
}


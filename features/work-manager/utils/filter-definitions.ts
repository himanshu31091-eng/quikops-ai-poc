import { OPEN_STATUS_GROUPS } from "@/src/domain/case-status";
import type { KpiKey } from "@/src/domain/types";
import type {
  RevenueBandKey,
  SortDirection,
  SortKey,
  WorkFilters,
  WorkKpi,
} from "../types";

/** Labels for the KPI a case is measured against, used by dashboard deep links. */
export const KPI_KEY_LABELS: Record<KpiKey, string> = {
  OTIF_PCT: "On-time in full",
  REVENUE_AT_RISK: "Revenue at risk",
  INVENTORY_DAYS: "Inventory days",
  SUPPLIER_OTD_PCT: "Supplier on-time delivery",
  SCHEDULE_ADHERENCE_PCT: "Schedule adherence",
  FORECAST_ACCURACY_PCT: "Forecast accuracy",
};

/**
 * Declarative description of every control in the module. Components read from
 * here rather than hard-coding option lists, so adding a band or a sort column
 * is a one-line change in one file.
 */

/* ------------------------------------------------------------ Revenue impact */

export const REVENUE_BAND_KEYS: RevenueBandKey[] = [
  "ABOVE_150K",
  "75K_TO_150K",
  "25K_TO_75K",
  "BELOW_25K",
];

export const REVENUE_BAND_META: Record<
  RevenueBandKey,
  { label: string; shortLabel: string; floor: number }
> = {
  ABOVE_150K: { label: "$150k and above", shortLabel: "≥ $150k", floor: 150_000 },
  "75K_TO_150K": { label: "$75k – $150k", shortLabel: "$75k–150k", floor: 75_000 },
  "25K_TO_75K": { label: "$25k – $75k", shortLabel: "$25k–75k", floor: 25_000 },
  BELOW_25K: { label: "Under $25k", shortLabel: "< $25k", floor: 0 },
};

export function revenueBandOf(amount: number): RevenueBandKey {
  if (amount >= REVENUE_BAND_META.ABOVE_150K.floor) return "ABOVE_150K";
  if (amount >= REVENUE_BAND_META["75K_TO_150K"].floor) return "75K_TO_150K";
  if (amount >= REVENUE_BAND_META["25K_TO_75K"].floor) return "25K_TO_75K";
  return "BELOW_25K";
}

/* -------------------------------------------------------------------- Sorting */

export const SORT_META: Record<
  SortKey,
  { label: string; defaultDirection: SortDirection }
> = {
  priority: { label: "Priority", defaultDirection: "desc" },
  caseNo: { label: "Case ID", defaultDirection: "desc" },
  title: { label: "Title", defaultDirection: "asc" },
  plant: { label: "Plant", defaultDirection: "asc" },
  category: { label: "Category", defaultDirection: "asc" },
  status: { label: "Status", defaultDirection: "asc" },
  owner: { label: "Owner", defaultDirection: "asc" },
  revenue: { label: "Revenue impact", defaultDirection: "desc" },
  due: { label: "Due date", defaultDirection: "asc" },
  age: { label: "Age", defaultDirection: "desc" },
  detected: { label: "Detected", defaultDirection: "desc" },
};

export const DEFAULT_SORT = { key: "priority" as SortKey, direction: "desc" as SortDirection };

/* -------------------------------------------------------------------- Filters */

export const EMPTY_FILTERS: WorkFilters = {
  search: "",
  plants: [],
  priorities: [],
  statusGroups: [],
  categories: [],
  revenueBands: [],
  owners: [],
  detectedBy: [],
  kpi: null,
  overdueOnly: false,
  mineOnly: false,
  completedToday: false,
};

export function hasActiveFilters(filters: WorkFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.plants.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statusGroups.length > 0 ||
    filters.categories.length > 0 ||
    filters.revenueBands.length > 0 ||
    filters.owners.length > 0 ||
    filters.detectedBy.length > 0 ||
    filters.kpi !== null ||
    filters.overdueOnly ||
    filters.mineOnly ||
    filters.completedToday
  );
}

/* --------------------------------------------------------------- KPI presets */

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

interface KpiPreset {
  label: string;
  icon: string;
  tone: WorkKpi["tone"];
  isActive: (filters: WorkFilters) => boolean;
  apply: (filters: WorkFilters, active: boolean) => WorkFilters;
}

/**
 * Each KPI tile is a filter preset, not a static number: clicking it narrows the
 * working set to exactly the cases it counts, and clicking again releases it.
 */
export const KPI_PRESETS: Record<WorkKpi["key"], KpiPreset> = {
  open: {
    label: "Open cases",
    icon: "Rows3",
    tone: "neutral",
    isActive: (f) => sameSet(f.statusGroups, OPEN_STATUS_GROUPS),
    apply: (f, active) => ({
      ...f,
      statusGroups: active ? [] : [...OPEN_STATUS_GROUPS],
      completedToday: false,
    }),
  },
  mine: {
    label: "Assigned to me",
    icon: "UserCog",
    tone: "accent",
    isActive: (f) => f.mineOnly,
    apply: (f, active) => ({ ...f, mineOnly: !active, owners: [] }),
  },
  overdue: {
    label: "Overdue",
    icon: "TriangleAlert",
    tone: "critical",
    isActive: (f) => f.overdueOnly,
    apply: (f, active) => ({ ...f, overdueOnly: !active }),
  },
  verification: {
    label: "Pending verification",
    icon: "ShieldCheck",
    tone: "verify",
    isActive: (f) => sameSet(f.statusGroups, ["WAITING_VERIFICATION"]),
    apply: (f, active) => ({
      ...f,
      statusGroups: active ? [] : ["WAITING_VERIFICATION"],
      completedToday: false,
    }),
  },
  completed: {
    label: "Completed today",
    icon: "CircleCheck",
    tone: "success",
    isActive: (f) => f.completedToday,
    apply: (f, active) => ({
      ...f,
      completedToday: !active,
      statusGroups: [],
      overdueOnly: false,
    }),
  },
};

export const KPI_ORDER: WorkKpi["key"][] = [
  "open",
  "mine",
  "overdue",
  "verification",
  "completed",
];

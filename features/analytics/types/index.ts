import type { CaseStatusGroup } from "@/src/domain/case-status";
import type {
  CaseListItem,
  ExceptionType,
  PriorityBand,
  TrendPoint,
} from "@/src/domain/types";

/**
 * Execution Analytics contracts.
 *
 * Everything the module renders is a pure function of `AnalyticsFilters` plus
 * the case array, which is what makes the whole page one memoised derivation.
 */

/** Windows a manager actually asks for. `all` is the seeded corpus. */
export type DateRangeKey = "30" | "60" | "90" | "all";

export interface AnalyticsFilters {
  plants: string[];
  priorities: PriorityBand[];
  categories: ExceptionType[];
  range: DateRangeKey;
}

export const EMPTY_ANALYTICS_FILTERS: AnalyticsFilters = {
  plants: [],
  priorities: [],
  categories: [],
  range: "90",
};

/** The multi-select facets. Named so the menus and the hook agree on one union. */
export type AnalyticsFilterField = "plants" | "priorities" | "categories";

/**
 * A case with the analytics-side derivations precomputed once — resolution
 * time, age, SLA outcome — so no chart or table recomputes them per render.
 */
export interface AnalyticsCase extends CaseListItem {
  statusGroup: CaseStatusGroup;
  /** Whole days since the case was opened. */
  ageDays: number;
  /** Hours from opened to verified. Null while the case is still open. */
  resolutionHours: number | null;
  /** That resolution against the case's own SLA target, in percent. */
  slaUsagePct: number | null;
  isOpen: boolean;
  isBreached: boolean;
  /** Resolved inside its SLA target — the numerator of the adherence figure. */
  metSla: boolean;
  /** ISO week key (`2026-W32`) the case was resolved in, when it was. */
  resolvedWeek: string | null;
  reviewerId: string;
}

export interface AnalyticsKpi {
  key: "mttr" | "sla" | "verification" | "recurrence";
  label: string;
  /** Formatted for display — the unit varies per card. */
  display: string;
  /** Change against the portfolio baseline. */
  deltaValue: number;
  deltaUnit: "pts" | "%" | "abs";
  higherIsBetter: boolean;
  footnote: string;
  icon: string;
  series: TrendPoint[];
}

export interface CategoryDatum {
  key: string;
  label: string;
  count: number;
  revenueAtRisk: number;
  color: string;
}

export interface WeeklyDatum {
  week: string;
  label: string;
  opened: number;
  closed: number;
}

export interface PlantPerformanceRow {
  plantCode: string;
  plantName: string;
  country: string;
  openCases: number;
  totalCases: number;
  slaAdherencePct: number;
  avgResolutionHours: number | null;
  revenueAtRisk: number;
  breached: number;
  /** 0–100 composite used to rank best and worst. */
  score: number;
}

export interface PersonPerformanceRow {
  userId: string;
  name: string;
  jobTitle: string;
  roleLabel: string;
  assigned: number;
  resolved: number;
  open: number;
  breached: number;
  slaAdherencePct: number;
  avgResolutionHours: number | null;
  revenueAtRisk: number;
}

/** One cell of a heatmap. `value` drives the label, `intensity` the shade. */
export interface HeatmapCell {
  rowKey: string;
  columnKey: string;
  value: number;
  /** 0–1, already normalised against the grid's own maximum. */
  intensity: number;
  detail: string;
}

export interface HeatmapGrid {
  rows: { key: string; label: string }[];
  columns: { key: string; label: string }[];
  cells: HeatmapCell[];
  /** Legend caption — what a darker cell means. */
  scaleLabel: string;
  emptyLabel: string;
}

/** Everything the page renders, derived in one pass. */
export interface AnalyticsModel {
  cases: AnalyticsCase[];
  kpis: AnalyticsKpi[];
  otifSeries: TrendPoint[];
  revenueSeries: TrendPoint[];
  resolutionSeries: TrendPoint[];
  weekly: WeeklyDatum[];
  byPriority: CategoryDatum[];
  byPlant: CategoryDatum[];
  byException: CategoryDatum[];
  topPlants: PlantPerformanceRow[];
  bottomPlants: PlantPerformanceRow[];
  owners: PersonPerformanceRow[];
  reviewers: PersonPerformanceRow[];
  slaHeatmap: HeatmapGrid;
  agingHeatmap: HeatmapGrid;
  /** True when any filter is narrowing the set. */
  isFiltered: boolean;
}

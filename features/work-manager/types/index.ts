import type { FilterOption } from "@/components/patterns/filter-menu";
import type { CaseStatusGroup } from "@/src/domain/case-status";
import type {
  CaseListItem,
  CaseStatus,
  DetectionSource,
  ExceptionType,
  KpiKey,
  PriorityBand,
} from "@/src/domain/types";

/** The two ways a manager can look at the same working set. */
export type WorkView = "table" | "board";

export type RevenueBandKey = "ABOVE_150K" | "75K_TO_150K" | "25K_TO_75K" | "BELOW_25K";

export type SortKey =
  | "priority"
  | "caseNo"
  | "title"
  | "plant"
  | "category"
  | "status"
  | "owner"
  | "revenue"
  | "due"
  | "age"
  | "detected";

export type SortDirection = "asc" | "desc";

export interface WorkSort {
  key: SortKey;
  direction: SortDirection;
}

/** Sentinel owner value — cases nobody has picked up are the ones that hurt. */
export const UNASSIGNED_OWNER = "UNASSIGNED";

/** The multi-select facets. Named so menus and the hook agree on one union. */
export type MultiFilterField =
  | "plants"
  | "priorities"
  | "statusGroups"
  | "categories"
  | "revenueBands"
  | "owners"
  | "detectedBy";

/**
 * The complete, serialisable description of what the manager is looking at.
 * Everything the module renders is a pure function of this plus the case array,
 * which is what makes the view shareable as a URL.
 */
export interface WorkFilters {
  search: string;
  plants: string[];
  priorities: PriorityBand[];
  statusGroups: CaseStatusGroup[];
  categories: ExceptionType[];
  revenueBands: RevenueBandKey[];
  /** User ids, plus `UNASSIGNED_OWNER` for cases with no owner. */
  owners: string[];
  detectedBy: DetectionSource[];
  /** Set when arriving from a dashboard KPI card, e.g. `/work?kpi=OTIF_PCT`. */
  kpi: KpiKey | null;
  overdueOnly: boolean;
  mineOnly: boolean;
  completedToday: boolean;
}

/**
 * A change made in this session. Applied over the server data rather than
 * mutating it, so a Refresh discards local edits and the table always shows
 * exactly what the data layer would return.
 */
export interface CaseOverride {
  status?: CaseStatus;
  ownerId?: string | null;
  assignedAt?: string | null;
  verifiedAt?: string | null;
  closedAt?: string | null;
}

/** A case with everything the table, board and cards need precomputed once. */
export interface WorkCaseRow extends CaseListItem {
  statusGroup: CaseStatusGroup;
  revenueBand: RevenueBandKey;
  /** Whole days since the case was opened. */
  ageDays: number;
  /** Whole days until the SLA due date; negative once breached. */
  dueInDays: number;
  isOverdue: boolean;
  isOpen: boolean;
  completedToday: boolean;
  /** Hours from opened to verified, for cases that reached verification. */
  resolutionHours: number | null;
  /** Carries an unsaved change made in this session. */
  isDirty: boolean;
  /** Created in this session and not yet persisted. */
  isDraft: boolean;
  /** Lower-cased haystack for search, built once per row. */
  haystack: string;
}

export interface WorkKpi {
  key: "open" | "mine" | "overdue" | "verification" | "completed";
  label: string;
  value: number;
  footnote: string;
  icon: string;
  tone: "neutral" | "accent" | "critical" | "verify" | "success";
  /** True when this tile's filter preset is currently applied. */
  active: boolean;
}

export interface WorkQuickStats {
  revenueAtRisk: number;
  revenueAtRiskSharePct: number;
  criticalCount: number;
  criticalRevenueAtRisk: number;
  unassignedCriticalCount: number;
  /** Mean opened-to-verified hours across the visible set, null when none. */
  averageResolutionHours: number | null;
  /** That mean expressed against each case's own SLA target, in percent. */
  averageSlaUsagePct: number | null;
  resolvedSampleSize: number;
  overdueCount: number;
  slaAtRiskCount: number;
}

/**
 * One selectable value in a filter menu, with a live count from the data.
 * Defined with the menu it belongs to — Execution Analytics uses the same
 * control, and a feature may not import from another feature. Re-exported so
 * existing Work Manager imports keep resolving.
 */
export type { FilterOption };

export interface WorkFacets {
  plants: FilterOption[];
  priorities: FilterOption[];
  statusGroups: FilterOption[];
  categories: FilterOption[];
  revenueBands: FilterOption[];
  owners: FilterOption[];
  detectedBy: FilterOption[];
}

export interface ActiveFilterChip {
  id: string;
  group: string;
  label: string;
}

/** Fields the Create Case dialog collects. Priority is never entered by hand. */
export interface NewCaseDraft {
  title: string;
  plantCode: string;
  exceptionType: ExceptionType;
  materialCode: string;
  materialDesc: string;
  supplierName: string;
  customerName: string;
  customerTier: "TIER_1" | "TIER_2" | "TIER_3" | "NONE";
  revenueAtRisk: string;
  daysToPromisedDate: string;
  ownerId: string;
  description: string;
}

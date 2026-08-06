import { CASE_STATUS_GROUPS, type CaseStatusGroup } from "@/src/domain/case-status";
import {
  DETECTION_SOURCES,
  EXCEPTION_TYPES,
  KPI_KEYS,
  PRIORITY_BANDS,
  type DetectionSource,
  type ExceptionType,
  type KpiKey,
  type PriorityBand,
} from "@/src/domain/types";
import type { RevenueBandKey, SortKey, WorkFilters, WorkSort, WorkView } from "../types";
import { UNASSIGNED_OWNER } from "../types";
import { DEFAULT_SORT, EMPTY_FILTERS, REVENUE_BAND_KEYS, SORT_META } from "./filter-definitions";

/**
 * The view is fully described by the URL, which is what makes a filtered set
 * shareable in a message and what makes the dashboard's KPI deep links
 * (`/work?band=CRITICAL`, `/work?overdue=true`, `/work?sort=revenue`) land on
 * the right working set instead of a generic list.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface WorkViewState {
  filters: WorkFilters;
  sort: WorkSort;
  view: WorkView;
}

export interface ParseOptions {
  plantCodes: string[];
  userIds: string[];
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function keep<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const allowedSet = new Set<string>(allowed);
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const candidate = value.toUpperCase();
    if (allowedSet.has(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      result.push(candidate as T);
    }
  }
  return result;
}

function isTruthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function parseWorkParams(
  params: RawSearchParams,
  { plantCodes, userIds }: ParseOptions,
): WorkViewState {
  const sortParam = first(params.sort);
  const sortKey: SortKey | undefined =
    sortParam && sortParam in SORT_META ? (sortParam as SortKey) : undefined;
  const directionParam = first(params.dir);

  const ownerCandidates = new Set([...userIds, UNASSIGNED_OWNER]);

  return {
    filters: {
      ...EMPTY_FILTERS,
      search: first(params.q)?.slice(0, 120) ?? "",
      plants: keep<string>(list(params.plant ?? params.plants), plantCodes),
      priorities: keep<PriorityBand>(list(params.band ?? params.priority), PRIORITY_BANDS),
      statusGroups: keep<CaseStatusGroup>(list(params.status), CASE_STATUS_GROUPS),
      categories: keep<ExceptionType>(list(params.category), EXCEPTION_TYPES),
      revenueBands: keep<RevenueBandKey>(list(params.revenue), REVENUE_BAND_KEYS),
      owners: list(params.owner).filter((id) => ownerCandidates.has(id)),
      detectedBy: keep<DetectionSource>(list(params.detected), DETECTION_SOURCES),
      kpi: keep<KpiKey>(list(params.kpi), KPI_KEYS)[0] ?? null,
      overdueOnly: isTruthy(first(params.overdue)),
      mineOnly: isTruthy(first(params.mine)),
      completedToday: isTruthy(first(params.completed)),
    },
    sort: sortKey
      ? {
          key: sortKey,
          direction:
            directionParam === "asc" || directionParam === "desc"
              ? directionParam
              : SORT_META[sortKey].defaultDirection,
        }
      : DEFAULT_SORT,
    view: first(params.view) === "board" ? "board" : "table",
  };
}

/** Inverse of `parseWorkParams`. Only non-default values are written. */
export function serializeWorkParams({ filters, sort, view }: WorkViewState): string {
  const params = new URLSearchParams();

  if (filters.search.trim() !== "") params.set("q", filters.search.trim());
  if (filters.plants.length > 0) params.set("plant", filters.plants.join(","));
  if (filters.priorities.length > 0) params.set("band", filters.priorities.join(","));
  if (filters.statusGroups.length > 0) params.set("status", filters.statusGroups.join(","));
  if (filters.categories.length > 0) params.set("category", filters.categories.join(","));
  if (filters.revenueBands.length > 0) params.set("revenue", filters.revenueBands.join(","));
  if (filters.owners.length > 0) params.set("owner", filters.owners.join(","));
  if (filters.detectedBy.length > 0) params.set("detected", filters.detectedBy.join(","));
  if (filters.kpi !== null) params.set("kpi", filters.kpi);
  if (filters.overdueOnly) params.set("overdue", "true");
  if (filters.mineOnly) params.set("mine", "true");
  if (filters.completedToday) params.set("completed", "true");
  if (sort.key !== DEFAULT_SORT.key || sort.direction !== DEFAULT_SORT.direction) {
    params.set("sort", sort.key);
    params.set("dir", sort.direction);
  }
  if (view !== "table") params.set("view", view);

  return params.toString();
}

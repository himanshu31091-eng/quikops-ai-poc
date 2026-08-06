import type { FilterOption } from "@/components/patterns/filter-menu";
import { EXCEPTION_META, PRIORITY_META } from "@/src/config/app-config";
import type { Plant } from "@/src/domain/types";
import { EXCEPTION_TYPES, PRIORITY_BANDS } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import type {
  AnalyticsCase,
  AnalyticsFilters,
  DateRangeKey,
} from "../types";

/**
 * Filtering and facet counts.
 *
 * The date range is applied on `openedAt`: a manager narrowing to 30 days is
 * asking "what has come at us recently", not "what closed recently". Applying
 * it to the resolution date instead would empty the aging heatmap, which is
 * about open work.
 */

const DAY_MS = 86_400_000;

export const DATE_RANGES: { key: DateRangeKey; label: string; days: number }[] = [
  { key: "30", label: "30 days", days: 30 },
  { key: "60", label: "60 days", days: 60 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: 3_650 },
];

export function rangeDays(key: DateRangeKey): number {
  return DATE_RANGES.find((range) => range.key === key)?.days ?? 90;
}

export function filterCases(
  cases: AnalyticsCase[],
  filters: AnalyticsFilters,
): AnalyticsCase[] {
  const cutoff = DEMO_NOW.getTime() - rangeDays(filters.range) * DAY_MS;

  return cases.filter((item) => {
    if (new Date(item.openedAt).getTime() < cutoff) return false;
    if (filters.plants.length > 0 && !filters.plants.includes(item.plantCode)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(item.priorityBand)) {
      return false;
    }
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(item.exceptionType)
    ) {
      return false;
    }
    return true;
  });
}

export function isFiltered(filters: AnalyticsFilters): boolean {
  return (
    filters.plants.length > 0 ||
    filters.priorities.length > 0 ||
    filters.categories.length > 0
  );
}

/**
 * Facet counts against the date-ranged set but ignoring the facet's own
 * selection, so a menu always shows what selecting an option would yield rather
 * than collapsing to the current choice.
 */
export function buildFacets(
  cases: AnalyticsCase[],
  filters: AnalyticsFilters,
  plants: Plant[],
): { plants: FilterOption[]; priorities: FilterOption[]; categories: FilterOption[] } {
  const without = (field: keyof AnalyticsFilters): AnalyticsCase[] =>
    filterCases(cases, { ...filters, [field]: [] });

  const plantPool = without("plants");
  const priorityPool = without("priorities");
  const categoryPool = without("categories");

  return {
    plants: plants.map((plant) => ({
      value: plant.code,
      label: plant.name,
      hint: plant.country,
      count: plantPool.filter((item) => item.plantCode === plant.code).length,
    })),
    priorities: PRIORITY_BANDS.map((band) => ({
      value: band,
      label: PRIORITY_META[band].label,
      count: priorityPool.filter((item) => item.priorityBand === band).length,
      dotClassName: PRIORITY_META[band].dotClassName,
    })),
    categories: EXCEPTION_TYPES.map((type) => ({
      value: type,
      label: EXCEPTION_META[type].label,
      count: categoryPool.filter((item) => item.exceptionType === type).length,
      icon: EXCEPTION_META[type].icon,
    })).filter((option) => option.count > 0),
  };
}

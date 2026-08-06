import {
  DETECTION_SOURCE_META,
  EXCEPTION_META,
  PRIORITY_META,
  ROLE_META,
} from "@/src/config/app-config";
import { CASE_STATUS_GROUPS, STATUS_GROUP_META } from "@/src/domain/case-status";
import {
  DETECTION_SOURCES,
  EXCEPTION_TYPES,
  PRIORITY_BANDS,
  type Plant,
  type User,
} from "@/src/domain/types";
import type { FilterOption, WorkCaseRow, WorkFacets } from "../types";
import { UNASSIGNED_OWNER } from "../types";
import { REVENUE_BAND_KEYS, REVENUE_BAND_META } from "./filter-definitions";

/**
 * Builds the option list behind every filter menu, with the number of cases
 * carrying each value. Counts come from the whole portfolio rather than the
 * current result set, so the menu answers "what else is out there" instead of
 * collapsing to the filter already applied.
 */
export function buildFacets(
  rows: WorkCaseRow[],
  plants: Plant[],
  users: User[],
): WorkFacets {
  const count = <T extends string>(pick: (row: WorkCaseRow) => T): Map<T, number> => {
    const tally = new Map<T, number>();
    for (const row of rows) {
      const key = pick(row);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    return tally;
  };

  const byPlant = count((row) => row.plantCode);
  const byPriority = count((row) => row.priorityBand);
  const byStatusGroup = count((row) => row.statusGroup);
  const byCategory = count((row) => row.exceptionType);
  const byRevenueBand = count((row) => row.revenueBand);
  const byOwner = count((row) => row.ownerId ?? UNASSIGNED_OWNER);
  const byDetection = count((row) => row.detectedBy);

  const ownerOptions: FilterOption[] = [
    {
      value: UNASSIGNED_OWNER,
      label: "Unassigned",
      hint: "Waiting for an owner",
      count: byOwner.get(UNASSIGNED_OWNER) ?? 0,
      icon: "CircleAlert",
    },
    ...users
      .map((user) => ({
        value: user.id,
        label: user.name,
        hint: ROLE_META[user.role].label,
        count: byOwner.get(user.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  ];

  return {
    plants: plants.map((plant) => ({
      value: plant.code,
      label: `${plant.code} · ${plant.name}`,
      hint: plant.country,
      count: byPlant.get(plant.code) ?? 0,
    })),
    priorities: PRIORITY_BANDS.map((band) => ({
      value: band,
      label: PRIORITY_META[band].label,
      count: byPriority.get(band) ?? 0,
      dotClassName: PRIORITY_META[band].dotClassName,
    })),
    statusGroups: CASE_STATUS_GROUPS.map((group) => ({
      value: group,
      label: STATUS_GROUP_META[group].label,
      count: byStatusGroup.get(group) ?? 0,
      dotClassName: STATUS_GROUP_META[group].dotClassName,
    })),
    categories: EXCEPTION_TYPES.filter((type) => (byCategory.get(type) ?? 0) > 0).map(
      (type) => ({
        value: type,
        label: EXCEPTION_META[type].label,
        count: byCategory.get(type) ?? 0,
        icon: EXCEPTION_META[type].icon,
      }),
    ),
    revenueBands: REVENUE_BAND_KEYS.map((band) => ({
      value: band,
      label: REVENUE_BAND_META[band].label,
      count: byRevenueBand.get(band) ?? 0,
      icon: "DollarSign",
    })),
    owners: ownerOptions,
    detectedBy: DETECTION_SOURCES.map((source) => ({
      value: source,
      label: DETECTION_SOURCE_META[source].label,
      hint: DETECTION_SOURCE_META[source].description,
      count: byDetection.get(source) ?? 0,
      icon: DETECTION_SOURCE_META[source].icon,
    })),
  };
}

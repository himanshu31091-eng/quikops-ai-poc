import { differenceInCalendarDays, isSameDay } from "date-fns";
import { EXCEPTION_META } from "@/src/config/app-config";
import { isOpenStatus, statusGroupOf } from "@/src/domain/case-status";
import type { CaseListItem } from "@/src/domain/types";
import type { WorkCaseRow } from "../types";
import { revenueBandOf } from "./filter-definitions";

const HOUR_MS = 3_600_000;

interface DeriveOptions {
  now: Date;
  isDirty?: boolean;
  isDraft?: boolean;
}

/**
 * Every value the table, board and cards read is computed here, once per row per
 * data change, rather than inside render. Sorting and filtering then compare
 * primitives instead of re-parsing dates on every keystroke.
 */
export function toWorkCaseRow(
  item: CaseListItem,
  { now, isDirty = false, isDraft = false }: DeriveOptions,
): WorkCaseRow {
  const openedAt = new Date(item.openedAt);
  const dueAt = new Date(item.dueAt);
  const verifiedAt = item.verifiedAt ? new Date(item.verifiedAt) : null;
  const closedAt = item.closedAt ? new Date(item.closedAt) : null;
  const isOpen = isOpenStatus(item.status);

  const haystack = [
    item.caseNo,
    item.title,
    item.materialCode,
    item.materialDesc,
    item.supplierCode,
    item.supplierName,
    item.customerCode,
    item.customerName,
    item.plantCode,
    item.plant.name,
    item.plant.country,
    item.owner?.name,
    EXCEPTION_META[item.exceptionType].label,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase();

  return {
    ...item,
    statusGroup: statusGroupOf(item.status),
    revenueBand: revenueBandOf(item.revenueAtRisk),
    ageDays: Math.max(differenceInCalendarDays(now, openedAt), 0),
    dueInDays: differenceInCalendarDays(dueAt, now),
    isOverdue: isOpen && dueAt.getTime() < now.getTime(),
    isOpen,
    completedToday:
      (verifiedAt !== null && isSameDay(verifiedAt, now)) ||
      (closedAt !== null && isSameDay(closedAt, now)),
    resolutionHours:
      verifiedAt !== null
        ? Math.round(((verifiedAt.getTime() - openedAt.getTime()) / HOUR_MS) * 10) / 10
        : null,
    isDirty,
    isDraft,
    haystack,
  };
}

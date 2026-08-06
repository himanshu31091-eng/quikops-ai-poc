import type { FilterOption } from "@/components/patterns/filter-menu";
import { ACTION_STATUS_META, PRIORITY_META } from "@/src/config/app-config";
import {
  actionSlaState,
  deadlineBucketOf,
  DEADLINE_BUCKETS,
  DEADLINE_BUCKET_META,
  hoursUntilDue,
  isOpenAction,
} from "@/src/domain/action-sla";
import type {
  ActionStatus,
  CorrectiveAction,
  Plant,
  User,
} from "@/src/domain/types";
import { PRIORITY_BANDS } from "@/src/domain/types";
import type { ActionCaseContext } from "@/src/data/queries/actions";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatNumber } from "@/src/lib/format";
import {
  UNASSIGNED_OWNER,
  type ActionFilters,
  type ActionKpi,
  type ActionOverride,
  type ActionRow,
  type ActionSort,
  type ActiveFilterChip,
  type DeadlineGroup,
} from "../types";

/**
 * Row shaping, filtering, sorting and aggregation.
 *
 * No business rule is restated: SLA banding and deadline bucketing come from
 * `src/domain/action-sla`, labels from `src/config/app-config`. This module
 * joins, counts and orders.
 */

const DAY_MS = 86_400_000;

/* --------------------------------------------------------------- Row shaping */

export function toActionRow(
  action: CorrectiveAction,
  context: ActionCaseContext,
  userById: Record<string, User>,
  override: ActionOverride | undefined,
): ActionRow {
  const merged: CorrectiveAction = override
    ? {
        ...action,
        ...(override.status !== undefined ? { status: override.status } : {}),
        ...(override.ownerId !== undefined ? { ownerId: override.ownerId } : {}),
        ...(override.completedAt !== undefined
          ? { completedAt: override.completedAt }
          : {}),
        ...(override.completionPct !== undefined
          ? { completionPct: override.completionPct }
          : {}),
        ...(override.dueAt !== undefined ? { dueAt: override.dueAt } : {}),
      }
    : action;

  const slaState = actionSlaState(
    {
      status: merged.status,
      dueAt: merged.dueAt,
      priorityBand: context.priorityBand,
    },
    DEMO_NOW,
  );
  const open = isOpenAction(merged.status);
  const owner = userById[merged.ownerId];
  const ownerName = owner?.name ?? "Unassigned";

  const completedToday =
    merged.completedAt !== null &&
    Math.abs(new Date(merged.completedAt).getTime() - DEMO_NOW.getTime()) < DAY_MS;

  return {
    ...merged,
    context,
    slaState,
    deadlineBucket: deadlineBucketOf(merged, DEMO_NOW),
    hoursUntilDue: hoursUntilDue(merged, DEMO_NOW),
    isOpen: open,
    isOverdue: slaState === "OVERDUE",
    // Approval means verification in this product: the case has been submitted
    // and is waiting on a reviewer who is never the owner. Deliberately keyed
    // on the case rather than the action's own progress — an action at 100%
    // has its status derived to DONE, so "open and complete" is unsatisfiable
    // by construction and would make this queue permanently empty.
    awaitingApproval: context.caseStatus === "PENDING_VERIFY",
    isEscalated: context.escalationLevel > 0,
    completedToday,
    ownerName,
    isDirty: override !== undefined,
    haystack: [
      merged.title,
      merged.description,
      merged.caseNo,
      context.caseTitle,
      context.plantName,
      context.supplierName ?? "",
      context.customerName ?? "",
      context.materialCode ?? "",
      ownerName,
    ]
      .join(" ")
      .toLowerCase(),
  };
}

/* ------------------------------------------------------------------ Filtering */

/** The preset views. Each answers one question the KPI tiles ask. */
const SCOPE_PREDICATE: Record<string, (row: ActionRow, sessionUserId: string) => boolean> = {
  all: () => true,
  assigned: (row, userId) => row.isOpen && row.ownerId === userId,
  overdue: (row) => row.isOverdue,
  breaches: (row) => row.isOpen && row.context.isBreached,
  approvals: (row) => row.awaitingApproval,
  escalations: (row) => row.isOpen && row.isEscalated,
  completed: (row) => row.completedToday,
};

export function filterActions(
  rows: ActionRow[],
  filters: ActionFilters,
  sessionUserId: string,
): ActionRow[] {
  const needle = filters.search.trim().toLowerCase();
  const scope = SCOPE_PREDICATE[filters.scope] ?? SCOPE_PREDICATE.all!;

  return rows.filter((row) => {
    if (!scope(row, sessionUserId)) return false;
    if (needle !== "" && !row.haystack.includes(needle)) return false;
    if (filters.plants.length > 0 && !filters.plants.includes(row.plantCode)) return false;
    if (
      filters.priorities.length > 0 &&
      !filters.priorities.includes(row.priorityBand)
    ) {
      return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
      return false;
    }
    if (filters.owners.length > 0) {
      const key = row.ownerId === "" ? UNASSIGNED_OWNER : row.ownerId;
      if (!filters.owners.includes(key)) return false;
    }
    return true;
  });
}

export function isFiltered(filters: ActionFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.plants.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statuses.length > 0 ||
    filters.owners.length > 0 ||
    filters.scope !== "all"
  );
}

/* -------------------------------------------------------------------- Sorting */

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const SLA_ORDER: Record<string, number> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  DUE_SOON: 2,
  ON_TRACK: 3,
  DONE: 4,
};

const STATUS_ORDER: Record<ActionStatus, number> = {
  BLOCKED: 0,
  IN_PROGRESS: 1,
  TODO: 2,
  DONE: 3,
  CANCELLED: 4,
};

export function sortActions(rows: ActionRow[], sort: ActionSort): ActionRow[] {
  const direction = sort.direction === "asc" ? 1 : -1;

  const compare = (a: ActionRow, b: ActionRow): number => {
    switch (sort.key) {
      case "priority":
        return (
          (PRIORITY_ORDER[a.priorityBand] ?? 9) - (PRIORITY_ORDER[b.priorityBand] ?? 9) ||
          b.context.priorityScore - a.context.priorityScore
        );
      case "case":
        return a.caseNo.localeCompare(b.caseNo);
      case "action":
        return a.title.localeCompare(b.title);
      case "owner":
        return a.ownerName.localeCompare(b.ownerName);
      case "due":
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      case "sla":
        return (SLA_ORDER[a.slaState] ?? 9) - (SLA_ORDER[b.slaState] ?? 9);
      case "status":
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      default:
        return 0;
    }
  };

  // Case number breaks every tie, so the order is stable across re-renders and
  // a manager can find the same row twice.
  return [...rows].sort(
    (a, b) => compare(a, b) * direction || a.caseNo.localeCompare(b.caseNo) || a.id.localeCompare(b.id),
  );
}

/* ----------------------------------------------------------------- KPI tiles */

export function computeKpis(
  rows: ActionRow[],
  filters: ActionFilters,
  sessionUserId: string,
): ActionKpi[] {
  const open = rows.filter((row) => row.isOpen);
  const assigned = open.filter((row) => row.ownerId === sessionUserId);
  const overdue = rows.filter((row) => row.isOverdue);
  const breaches = open.filter((row) => row.context.isBreached);
  const approvals = rows.filter((row) => row.awaitingApproval);

  return [
    {
      key: "assigned",
      label: "Actions assigned to me",
      value: assigned.length,
      footnote: `${formatNumber(open.length)} open across the network`,
      icon: "ListChecks",
      tone: "accent",
      scope: "assigned",
      active: filters.scope === "assigned",
    },
    {
      key: "overdue",
      label: "Overdue actions",
      value: overdue.length,
      footnote:
        overdue.length === 0
          ? "Nothing past its due date"
          : `${formatNumber(overdue.filter((row) => row.priorityBand === "CRITICAL").length)} on critical cases`,
      icon: "TriangleAlert",
      tone: "critical",
      scope: "overdue",
      active: filters.scope === "overdue",
    },
    {
      key: "breaches",
      label: "SLA breaches",
      value: breaches.length,
      footnote: `Open actions on cases already past target`,
      icon: "Clock",
      tone: "high",
      scope: "breaches",
      active: filters.scope === "breaches",
    },
    {
      key: "approvals",
      label: "Pending approvals",
      value: approvals.length,
      footnote:
        approvals.length === 0
          ? "Nothing waiting on a reviewer"
          : `Across ${new Set(approvals.map((row) => row.caseNo)).size} case${
              new Set(approvals.map((row) => row.caseNo)).size === 1 ? "" : "s"
            } awaiting sign-off`,
      icon: "ShieldCheck",
      tone: "success",
      scope: "approvals",
      active: filters.scope === "approvals",
    },
  ];
}

/* ------------------------------------------------------------ Deadline groups */

/** Open actions grouped into the timeline buckets, soonest bucket first. */
export function buildDeadlineGroups(rows: ActionRow[]): DeadlineGroup[] {
  return DEADLINE_BUCKETS.map((bucket) => {
    const meta = DEADLINE_BUCKET_META[bucket];
    return {
      bucket,
      label: meta.label,
      tone: meta.tone,
      actions: rows
        .filter((row) => row.deadlineBucket === bucket)
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    };
  }).filter((group) => group.actions.length > 0);
}

/* ---------------------------------------------------------------- Facets */

export function buildFacets(
  rows: ActionRow[],
  plants: Plant[],
  users: User[],
): {
  plants: FilterOption[];
  priorities: FilterOption[];
  statuses: FilterOption[];
  owners: FilterOption[];
} {
  const statuses: ActionStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

  return {
    plants: plants
      .map((plant) => ({
        value: plant.code,
        label: plant.name,
        hint: plant.country,
        count: rows.filter((row) => row.plantCode === plant.code).length,
      }))
      .filter((option) => option.count > 0),
    priorities: PRIORITY_BANDS.map((band) => ({
      value: band,
      label: PRIORITY_META[band].label,
      count: rows.filter((row) => row.priorityBand === band).length,
      dotClassName: PRIORITY_META[band].dotClassName,
    })).filter((option) => option.count > 0),
    statuses: statuses
      .map((status) => ({
        value: status,
        label: ACTION_STATUS_META[status].label,
        count: rows.filter((row) => row.status === status).length,
        dotClassName: ACTION_STATUS_META[status].dotClassName,
      }))
      .filter((option) => option.count > 0),
    owners: users
      .map((user) => ({
        value: user.id,
        label: user.name,
        hint: user.jobTitle,
        count: rows.filter((row) => row.ownerId === user.id).length,
      }))
      .filter((option) => option.count > 0),
  };
}

/* ------------------------------------------------------------- Filter chips */

export function buildFilterChips(
  filters: ActionFilters,
  plants: Plant[],
  users: User[],
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.search.trim() !== "") {
    chips.push({ id: "search", group: "Search", label: `“${filters.search.trim()}”` });
  }
  for (const code of filters.plants) {
    chips.push({
      id: `plants:${code}`,
      group: "Plant",
      label: plants.find((plant) => plant.code === code)?.name ?? code,
    });
  }
  for (const band of filters.priorities) {
    chips.push({
      id: `priorities:${band}`,
      group: "Priority",
      label: PRIORITY_META[band].label,
    });
  }
  for (const status of filters.statuses) {
    chips.push({
      id: `statuses:${status}`,
      group: "Status",
      label: ACTION_STATUS_META[status].label,
    });
  }
  for (const ownerId of filters.owners) {
    chips.push({
      id: `owners:${ownerId}`,
      group: "Owner",
      label: users.find((user) => user.id === ownerId)?.name ?? "Unassigned",
    });
  }

  return chips;
}

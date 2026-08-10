import { isOpenStatus } from "@/src/domain/case-status";
import type {
  ActivityEvent,
  CaseListItem,
  ExecutionMetrics,
  KpiCardModel,
  RevenueImpactBucket,
  User,
} from "@/src/domain/types";
import { formatMoney, formatNumber } from "@/src/lib/format";
import type { CaseExecutionOverride, ExecutionState, WorkflowEvent } from "./types";

/**
 * How each screen turns session outcomes into the numbers it shows.
 *
 * Every projection is pure and takes the server-rendered baseline plus the
 * overrides, so a screen with an empty store renders byte-identically to the
 * server response. That property is what lets the dashboard stay a server
 * component with a thin reactive shell over it.
 */

/** Applies session outcomes to a stored case. */
export function applyExecutionOverride(
  item: CaseListItem,
  override: CaseExecutionOverride | undefined,
  userById: Record<string, User>,
): CaseListItem {
  if (!override) return item;

  const ownerId = override.ownerId === undefined ? item.ownerId : override.ownerId;

  return {
    ...item,
    ...(override.status !== undefined ? { status: override.status } : {}),
    ...(override.priorityBand !== undefined ? { priorityBand: override.priorityBand } : {}),
    ...(override.dueAt !== undefined ? { dueAt: override.dueAt } : {}),
    ...(override.assignedAt !== undefined ? { assignedAt: override.assignedAt } : {}),
    ...(override.verifiedAt !== undefined ? { verifiedAt: override.verifiedAt } : {}),
    ...(override.closedAt !== undefined ? { closedAt: override.closedAt } : {}),
    ownerId,
    owner: ownerId ? (userById[ownerId] ?? null) : null,
  };
}


/**
 * Folds outcomes onto the fields the aggregate views actually read — status,
 * priority band and owner id. Deliberately does not resolve the joined `owner`
 * object: counting unassigned cases needs the id, not the person, and asking
 * the dashboard to carry a user directory just to compute a KPI would be silly.
 */
export function projectCaseFacts(
  cases: CaseListItem[],
  state: ExecutionState,
): CaseListItem[] {
  const hasOverrides = Object.keys(state.overrides).length > 0;
  if (!hasOverrides && state.createdCases.length === 0) return cases;

  const source =
    state.createdCases.length > 0 ? [...state.createdCases, ...cases] : cases;

  return source.map((item) => {
    const override = state.overrides[item.caseNo];
    if (!override) return item;
    return {
      ...item,
      ...(override.status !== undefined ? { status: override.status } : {}),
      ...(override.priorityBand !== undefined
        ? { priorityBand: override.priorityBand }
        : {}),
      ownerId: override.ownerId === undefined ? item.ownerId : override.ownerId,
    };
  });
}

/* ------------------------------------------------------------ Revenue split */

export interface RevenueMovement {
  /** Exposure that left the at-risk pool because a case was verified. */
  recovered: number;
  /** Case numbers behind that figure. */
  caseNos: string[];
}

/**
 * Revenue only counts as recovered once a reviewer has verified the outcome.
 * Closing a case without verification moves nothing — that is the whole point
 * of having a verification step.
 */
export function revenueMovement(
  cases: CaseListItem[],
  state: ExecutionState,
): RevenueMovement {
  const byCaseNo = new Map(cases.map((item) => [item.caseNo, item]));
  let recovered = 0;
  const caseNos: string[] = [];

  for (const override of Object.values(state.overrides)) {
    if (override.revenueRecovered === undefined) continue;
    const item = byCaseNo.get(override.caseNo);
    // Only count cases that were genuinely open in the baseline; re-verifying
    // an already-closed case must not inflate the recovered figure.
    if (!item || !isOpenStatus(item.status)) continue;
    recovered += override.revenueRecovered;
    caseNos.push(override.caseNo);
  }

  return { recovered, caseNos };
}

/* ------------------------------------------------------------- Headline KPIs */

/**
 * Re-derives the four headline cards against the projected case set.
 *
 * The sparkline, target and footnote stay as the server produced them; only the
 * value and the "vs baseline" delta move, because the trend series is history
 * and history does not change when you close a case.
 */
export function projectKpis(
  kpis: KpiCardModel[],
  baseline: CaseListItem[],
  projected: CaseListItem[],
  state: ExecutionState,
): KpiCardModel[] {
  if (Object.keys(state.overrides).length === 0 && state.createdCases.length === 0) {
    return kpis;
  }

  const openBefore = baseline.filter((item) => isOpenStatus(item.status));
  const openAfter = projected.filter((item) => isOpenStatus(item.status));

  const riskBefore = openBefore.reduce((sum, item) => sum + item.revenueAtRisk, 0);
  const riskAfter = openAfter.reduce((sum, item) => sum + item.revenueAtRisk, 0);

  const criticalAfter = openAfter.filter((item) => item.priorityBand === "CRITICAL").length;
  const criticalBefore = openBefore.filter(
    (item) => item.priorityBand === "CRITICAL",
  ).length;

  const breachedAfter = openAfter.filter((item) => item.slaBreachedAt !== null).length;
  const breachedBefore = openBefore.filter((item) => item.slaBreachedAt !== null).length;

  const unassignedAfter = openAfter.filter((item) => item.ownerId === null).length;

  return kpis.map((model) => {
    switch (model.key) {
      case "revenue":
        return {
          ...model,
          value: riskAfter,
          footnote: `Across ${formatNumber(openAfter.length)} open cases · ${formatMoney(
            Math.max(riskBefore - riskAfter, 0),
          )} cleared this session`,
        };
      case "critical":
        return {
          ...model,
          value: criticalAfter,
          deltaValue: criticalAfter - criticalBefore,
          footnote: `${formatNumber(unassignedAfter)} unassigned overall`,
        };
      case "breaches":
        return {
          ...model,
          value: breachedAfter,
          deltaValue: breachedAfter - breachedBefore,
        };
      // OTIF is measured by the data platform over a window, not recomputed from the
      // case list. Leaving it alone is the honest answer.
      default:
        return model;
    }
  });
}

/* ------------------------------------------------ Revenue impact by category */

/** Moves verified exposure from the at-risk column into recovered, per type. */
export function projectRevenueImpact(
  buckets: RevenueImpactBucket[],
  cases: CaseListItem[],
  state: ExecutionState,
): RevenueImpactBucket[] {
  const movement = revenueMovement(cases, state);
  if (movement.caseNos.length === 0) return buckets;

  const byCaseNo = new Map(cases.map((item) => [item.caseNo, item]));
  const shift = new Map<string, number>();

  for (const caseNo of movement.caseNos) {
    const item = byCaseNo.get(caseNo);
    if (!item) continue;
    shift.set(
      item.exceptionType,
      (shift.get(item.exceptionType) ?? 0) + item.revenueAtRisk,
    );
  }

  return buckets.map((bucket) => {
    const moved = shift.get(bucket.exceptionType) ?? 0;
    if (moved === 0) return bucket;
    return {
      ...bucket,
      atRisk: Math.max(bucket.atRisk - moved, 0),
      recovered: bucket.recovered + moved,
    };
  });
}

/* ------------------------------------------------------ Execution metrics */

const HOUR_MS = 3_600_000;

/**
 * Blends this session's verified cases into the portfolio figures.
 *
 * Mean time to resolve is a running average, so a case verified now is folded
 * in by weight rather than replacing the quarter's number: the strip keeps
 * reporting the portfolio, it just includes the work the manager has done in
 * front of the client.
 */
export function projectExecutionMetrics(
  metrics: ExecutionMetrics,
  cases: CaseListItem[],
  state: ExecutionState,
): ExecutionMetrics {
  const byCaseNo = new Map(cases.map((item) => [item.caseNo, item]));
  const resolved: number[] = [];

  for (const override of Object.values(state.overrides)) {
    if (!override.verifiedAt) continue;
    const item = byCaseNo.get(override.caseNo);
    if (!item || !isOpenStatus(item.status)) continue;
    const hours =
      (new Date(override.verifiedAt).getTime() - new Date(item.openedAt).getTime()) / HOUR_MS;
    if (hours > 0) resolved.push(hours);
  }

  if (resolved.length === 0) return metrics;

  const priorWeight = metrics.casesClosedThisWeek;
  const sessionTotal = resolved.reduce((sum, hours) => sum + hours, 0);
  const blended =
    (metrics.mttrHours * priorWeight + sessionTotal) / (priorWeight + resolved.length);

  return {
    ...metrics,
    mttrHours: Math.round(blended * 10) / 10,
    casesClosedThisWeek: metrics.casesClosedThisWeek + resolved.length,
  };
}

/* --------------------------------------------------------------- Activity */

const ACTIVITY_KIND: Record<WorkflowEvent["kind"], ActivityEvent["kind"]> = {
  ASSIGNED: "CASE_ASSIGNED",
  WORK_STARTED: "CASE_ASSIGNED",
  ACTION_COMPLETED: "ACTION_COMPLETED",
  EVIDENCE_UPLOADED: "COMMENT_ADDED",
  VERIFICATION_REQUESTED: "VERIFICATION_SUBMITTED",
  VERIFICATION_APPROVED: "VERIFICATION_APPROVED",
  VERIFICATION_REJECTED: "VERIFICATION_REJECTED",
  CASE_CLOSED: "CASE_CLOSED",
  CASE_CREATED: "CASE_CREATED",
  BULK_ASSIGNED: "CASE_ASSIGNED",
  BULK_CLOSED: "CASE_CLOSED",
};

/**
 * Puts this session's workflow events at the head of the stored activity feed.
 *
 * The feed is capped rather than merged by timestamp: session events are always
 * the most recent thing that happened, so ordering them by hand would only
 * re-derive that. On an empty store this returns `stored` unchanged.
 */
export function projectActivity(
  stored: ActivityEvent[],
  state: ExecutionState,
  limit: number,
): ActivityEvent[] {
  if (state.events.length === 0) return stored;

  const live: ActivityEvent[] = state.events.map((event) => ({
    id: event.id,
    kind: ACTIVITY_KIND[event.kind],
    actorName: event.actorName,
    actorRole: event.actorRole,
    caseNo: event.caseNo,
    summary: event.summary,
    at: event.at,
  }));

  return [...live, ...stored].slice(0, limit);
}


import { actionSlaState, isOpenAction } from "@/src/domain/action-sla";
import { isOpenStatus, statusGroupOf } from "@/src/domain/case-status";
import { resolvedAtOf } from "@/src/domain/portfolio-metrics";
import type {
  CaseListItem,
  ExecutionMetrics,
  InventoryHealthRow,
  PlantHealth,
  RevenueImpactBucket,
} from "@/src/domain/types";
import { PRIORITY_BANDS } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { buildCorrectiveActions } from "../fixtures/case-detail";
import { CASES } from "../fixtures/cases";
import {
  EXECUTION_METRICS,
  INVENTORY_HEALTH,
  PLANT_HEALTH,
  REVENUE_IMPACT,
} from "../fixtures/metrics";
import { USER_BY_ID } from "../fixtures/organisation";
import { toCaseListItem } from "./case-mapper";

/**
 * Portfolio data access.
 *
 * The Copilot on the Executive Dashboard answers about the whole operation
 * rather than one case, so it needs the same aggregate the dashboard renders —
 * assembled server-side, for the same reason the case record is: a client may
 * ask a question, it may not supply the facts.
 *
 * Same contract as every other query module: async, finished view model,
 * fixture read swappable for a real query without touching a caller.
 */

const HOUR_MS = 3_600_000;

export interface PortfolioTotals {
  totalCases: number;
  openCases: number;
  revenueAtRisk: number;
  currency: string;
  criticalOpen: number;
  highOpen: number;
  breachedOpen: number;
  unassignedOpen: number;
  pendingVerification: number;
  recurringOpen: number;
  escalatedOpen: number;
}

export interface SupplierExposure {
  supplierName: string;
  openCases: number;
  revenueAtRisk: number;
  maxRecurrence: number;
}

export interface OverdueAction {
  title: string;
  caseNo: string;
  caseTitle: string;
  ownerName: string;
  plantCode: string;
  priorityBand: string;
  hoursOverdue: number;
  completionPct: number;
}

export interface ActionExecution {
  openActions: number;
  overdue: number;
  dueToday: number;
  blocked: number;
  /**
   * The overdue ones by name, worst first. A count alone lets an answer say
   * "seven actions are overdue" and stop; the list is what lets it say which.
   */
  overdueDetail: OverdueAction[];
}

export interface MovedCase {
  caseNo: string;
  title: string;
  plantCode: string;
  priorityBand: string;
}

export interface RecentMovement {
  windowDays: number;
  opened: MovedCase[];
  /**
   * Left the open pool inside the window. Uses `resolvedAtOf`, the same
   * definition `weeklyThroughput` counts with, so this list and the
   * "cases closed this week" metric can never disagree in the same prompt.
   */
  resolved: MovedCase[];
  /** Passed their resolution target inside the window — the direction that hurts. */
  newlyBreached: MovedCase[];
}

export interface PortfolioSnapshot {
  generatedAt: string;
  totals: PortfolioTotals;
  /** Open cases only, highest priority first. The working set. */
  openCases: CaseListItem[];
  byBand: { band: string; count: number; revenueAtRisk: number }[];
  byStatusGroup: { group: string; count: number }[];
  plants: PlantHealth[];
  metrics: ExecutionMetrics;
  revenueImpact: RevenueImpactBucket[];
  inventory: InventoryHealthRow[];
  /** Suppliers with more than one open case — the commercial escalation view. */
  supplierExposure: SupplierExposure[];
  /** Corrective-action execution. Cases say what is wrong; actions say what is being done. */
  actionExecution: ActionExecution;
  /** What moved in the last week, from the recorded timestamps rather than a feed. */
  recentMovement: RecentMovement;
}

/** Suppliers carrying more than one open case, worst exposure first. */
function buildSupplierExposure(open: CaseListItem[]): SupplierExposure[] {
  const bySupplier = new Map<string, SupplierExposure>();

  for (const item of open) {
    if (!item.supplierName) continue;
    const entry = bySupplier.get(item.supplierName) ?? {
      supplierName: item.supplierName,
      openCases: 0,
      revenueAtRisk: 0,
      maxRecurrence: 0,
    };
    entry.openCases += 1;
    entry.revenueAtRisk += item.revenueAtRisk;
    entry.maxRecurrence = Math.max(entry.maxRecurrence, item.recurrenceCount);
    bySupplier.set(item.supplierName, entry);
  }

  return [...bySupplier.values()]
    .filter((entry) => entry.openCases > 1)
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
}

/** Named overdue actions are capped: the context is bounded, and the tail adds count, not insight. */
const DETAILED_OVERDUE_ACTIONS = 10;
const RECENT_WINDOW_DAYS = 7;

/**
 * Corrective-action execution across the portfolio.
 *
 * Reads `buildCorrectiveActions`, the same function the Action Center and Case
 * Detail read, rather than deriving a second set — an answer that disagrees
 * with the screen it is being asked about is worse than no answer.
 */
function buildActionExecution(all: CaseListItem[]): ActionExecution {
  const actions = all.flatMap((item) => buildCorrectiveActions(item));
  const open = actions.filter((action) => isOpenAction(action.status));

  const overdueDetail: OverdueAction[] = open
    .filter(
      (action) =>
        actionSlaState(
          { status: action.status, dueAt: action.dueAt, priorityBand: action.priorityBand },
          DEMO_NOW,
        ) === "OVERDUE",
    )
    .map((action) => ({
      title: action.title,
      caseNo: action.caseNo,
      caseTitle: action.caseTitle,
      ownerName: USER_BY_ID[action.ownerId]?.name ?? "Unassigned",
      plantCode: action.plantCode,
      priorityBand: action.priorityBand,
      hoursOverdue: Math.round(
        (DEMO_NOW.getTime() - new Date(action.dueAt).getTime()) / HOUR_MS,
      ),
      completionPct: action.completionPct,
    }))
    .sort((a, b) => b.hoursOverdue - a.hoursOverdue);

  const stateOf = (action: (typeof open)[number]) =>
    actionSlaState(
      { status: action.status, dueAt: action.dueAt, priorityBand: action.priorityBand },
      DEMO_NOW,
    );

  return {
    openActions: open.length,
    overdue: overdueDetail.length,
    dueToday: open.filter((action) => stateOf(action) === "DUE_TODAY").length,
    blocked: open.filter((action) => action.status === "BLOCKED").length,
    overdueDetail: overdueDetail.slice(0, DETAILED_OVERDUE_ACTIONS),
  };
}

/** What moved in the window, read from the case's own timestamps. */
function buildRecentMovement(all: CaseListItem[]): RecentMovement {
  const cutoff = DEMO_NOW.getTime() - RECENT_WINDOW_DAYS * 24 * HOUR_MS;
  const inWindow = (timestamp: string | null) =>
    timestamp !== null && new Date(timestamp).getTime() >= cutoff;

  const moved = (item: CaseListItem): MovedCase => ({
    caseNo: item.caseNo,
    title: item.title,
    plantCode: item.plantCode,
    priorityBand: item.priorityBand,
  });

  return {
    windowDays: RECENT_WINDOW_DAYS,
    opened: all.filter((item) => inWindow(item.openedAt)).map(moved),
    resolved: all.filter((item) => inWindow(resolvedAtOf(item))).map(moved),
    newlyBreached: all.filter((item) => inWindow(item.slaBreachedAt)).map(moved),
  };
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const all = CASES.map(toCaseListItem);
  const open = all
    .filter((item) => isOpenStatus(item.status))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const byBand = PRIORITY_BANDS.map((band) => {
    const matching = open.filter((item) => item.priorityBand === band);
    return {
      band,
      count: matching.length,
      revenueAtRisk: matching.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    };
  });

  const groupCounts = new Map<string, number>();
  for (const item of open) {
    const group = statusGroupOf(item.status);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }

  return {
    generatedAt: DEMO_NOW.toISOString(),
    totals: {
      totalCases: all.length,
      openCases: open.length,
      revenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
      currency: open[0]?.currency ?? "USD",
      criticalOpen: open.filter((item) => item.priorityBand === "CRITICAL").length,
      highOpen: open.filter((item) => item.priorityBand === "HIGH").length,
      breachedOpen: open.filter((item) => item.slaBreachedAt !== null).length,
      unassignedOpen: open.filter((item) => item.ownerId === null).length,
      pendingVerification: open.filter((item) => item.status === "PENDING_VERIFY").length,
      recurringOpen: open.filter((item) => item.recurrenceCount > 1).length,
      escalatedOpen: open.filter((item) => item.escalationLevel > 0).length,
    },
    openCases: open,
    byBand,
    byStatusGroup: [...groupCounts.entries()].map(([group, count]) => ({ group, count })),
    plants: PLANT_HEALTH,
    metrics: EXECUTION_METRICS,
    revenueImpact: REVENUE_IMPACT,
    inventory: INVENTORY_HEALTH,
    supplierExposure: buildSupplierExposure(open),
    actionExecution: buildActionExecution(all),
    recentMovement: buildRecentMovement(all),
  };
}

/** Hours a case has been open, for the rendered context. */
export function ageHours(openedAt: string): number {
  return Math.round((DEMO_NOW.getTime() - new Date(openedAt).getTime()) / HOUR_MS);
}

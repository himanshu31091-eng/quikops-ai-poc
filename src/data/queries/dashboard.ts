import type {
  ActionItem,
  ActivityEvent,
  AiExecutiveSummary,
  CaseListItem,
  ExecutionMetrics,
  InventoryHealthRow,
  KpiCardModel,
  PlantHealth,
  PriorityDistributionSlice,
  RevenueImpactBucket,
  TrendPoint,
} from "@/src/domain/types";
import { isOpenStatus } from "@/src/domain/case-status";
import { PRIORITY_BANDS } from "@/src/domain/types";
import { OTIF_TARGET_PCT, SPARKLINE_POINTS } from "@/src/lib/constants";
import { CASES } from "../fixtures/cases";
import { toCaseListItem } from "./case-mapper";
import {
  ACTIVITY_FEED,
  EXECUTIVE_SUMMARY,
  TODAYS_ACTIONS,
} from "../fixtures/intelligence";
import {
  EXECUTION_METRICS,
  INVENTORY_HEALTH,
  OPEN_CRITICAL_SERIES_90D,
  OTIF_SERIES_90D,
  PLANT_HEALTH,
  REVENUE_AT_RISK_SERIES_90D,
  REVENUE_IMPACT,
  SLA_BREACH_SERIES_90D,
} from "../fixtures/metrics";

/**
 * Data-access layer.
 *
 * Every function is async and returns a fully-formed view model. When Neon is
 * connected, the body of each function is replaced by a Prisma query returning
 * the same shape — no component changes required. This is the only file that
 * changes when persistence goes live.
 */

const openCases = () => CASES.filter((c) => isOpenStatus(c.status));

function tail(series: TrendPoint[], count = SPARKLINE_POINTS): TrendPoint[] {
  return series.slice(-count);
}

/* ------------------------------------------------------------------ KPI band */

export async function getHeadlineKpis(): Promise<KpiCardModel[]> {
  const open = openCases();
  const revenueAtRisk = open.reduce((sum, c) => sum + c.revenueAtRisk, 0);
  const criticalOpen = open.filter((c) => c.priorityBand === "CRITICAL").length;
  const breaches = open.filter((c) => c.slaBreachedAt !== null).length;
  const otif = OTIF_SERIES_90D[OTIF_SERIES_90D.length - 1]?.value ?? 0;
  const otif30dAgo = OTIF_SERIES_90D[OTIF_SERIES_90D.length - 31]?.value ?? otif;

  return [
    {
      key: "otif",
      label: "On-time in full",
      value: otif,
      unit: "PERCENT",
      target: OTIF_TARGET_PCT,
      deltaValue: Math.round((otif - otif30dAgo) * 10) / 10,
      deltaUnit: "pts",
      higherIsBetter: true,
      series: tail(OTIF_SERIES_90D),
      footnote: `${(OTIF_TARGET_PCT - otif).toFixed(1)} pts below target`,
      href: "/work?kpi=OTIF_PCT",
    },
    {
      key: "revenue",
      label: "Revenue at risk",
      value: revenueAtRisk,
      unit: "CURRENCY",
      target: null,
      deltaValue: 18.4,
      deltaUnit: "%",
      higherIsBetter: false,
      series: tail(REVENUE_AT_RISK_SERIES_90D),
      footnote: `Across ${open.length} open cases`,
      href: "/work?sort=revenue",
    },
    {
      key: "critical",
      label: "Open critical cases",
      value: criticalOpen,
      unit: "COUNT",
      target: null,
      deltaValue: 2,
      deltaUnit: "abs",
      higherIsBetter: false,
      series: tail(OPEN_CRITICAL_SERIES_90D),
      footnote: `${open.filter((c) => c.ownerId === null).length} unassigned overall`,
      href: "/work?band=CRITICAL",
    },
    {
      key: "breaches",
      label: "SLA breaches",
      value: breaches,
      unit: "COUNT",
      target: null,
      deltaValue: -1,
      deltaUnit: "abs",
      higherIsBetter: false,
      series: tail(SLA_BREACH_SERIES_90D),
      footnote: `${EXECUTION_METRICS.slaAdherencePct.toFixed(1)}% adherence this quarter`,
      href: "/work?overdue=true",
    },
  ];
}

/* --------------------------------------------------------------- Panel loads */

export async function getExecutiveSummary(): Promise<AiExecutiveSummary> {
  return EXECUTIVE_SUMMARY;
}

export async function getCriticalCases(limit = 5): Promise<CaseListItem[]> {
  return openCases()
    .filter((c) => c.priorityBand === "CRITICAL" || c.priorityBand === "HIGH")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit)
    .map(toCaseListItem);
}

export async function getPlantHealth(): Promise<PlantHealth[]> {
  return PLANT_HEALTH;
}

export async function getTodaysActions(limit = 5): Promise<ActionItem[]> {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  return [...TODAYS_ACTIONS]
    .sort(
      (a, b) =>
        order[a.priorityBand] - order[b.priorityBand] ||
        new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )
    .slice(0, limit);
}

export async function getOtifTrend(): Promise<TrendPoint[]> {
  return OTIF_SERIES_90D;
}

export async function getActivityFeed(limit = 8): Promise<ActivityEvent[]> {
  return ACTIVITY_FEED.slice(0, limit);
}

export async function getPriorityDistribution(): Promise<PriorityDistributionSlice[]> {
  const open = openCases();
  return PRIORITY_BANDS.map((band) => {
    const matching = open.filter((c) => c.priorityBand === band);
    return {
      band,
      count: matching.length,
      revenueAtRisk: matching.reduce((sum, c) => sum + c.revenueAtRisk, 0),
    };
  });
}

export async function getRevenueImpact(): Promise<RevenueImpactBucket[]> {
  return [...REVENUE_IMPACT].sort((a, b) => b.atRisk - a.atRisk);
}

export async function getInventoryHealth(): Promise<InventoryHealthRow[]> {
  return INVENTORY_HEALTH;
}

export async function getExecutionMetrics(): Promise<ExecutionMetrics> {
  return EXECUTION_METRICS;
}

/**
 * The stored case list, used by the dashboard's reactive shell to re-derive
 * headline numbers against work done in the current session.
 */
export async function getCaseBaseline(): Promise<CaseListItem[]> {
  return CASES.map(toCaseListItem);
}

/* ------------------------------------------------------------- Shell badges */

export async function getNavBadgeCounts(): Promise<Record<string, number>> {
  const open = openCases();
  return {
    unassigned: open.filter((c) => c.ownerId === null).length,
    myOpen: TODAYS_ACTIONS.filter((a) => a.status !== "DONE").length,
    approvals: open.filter((c) => c.status === "PENDING_VERIFY").length,
    breaches: open.filter((c) => c.slaBreachedAt !== null).length,
  };
}

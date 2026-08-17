import { ALL_PLANTS, scopeCases, type PlantScope } from "@/src/scope/plant-scope";
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
import { computePlantRollup } from "@/src/domain/portfolio-metrics";
import { PRIORITY_BANDS } from "@/src/domain/types";
import { DEMO_NOW, OTIF_TARGET_PCT, SPARKLINE_POINTS } from "@/src/lib/constants";
import { DEFAULT_TENANT_ID, getTenantConfig } from "@/src/config/tenant";
import { USE_DATABASE } from "../db";
import { getCaseCorpus, getPlants } from "./corpus";
import { findAuditForTenant, findOpenActionsForTenant } from "./portfolio-db-mapper";
import {
  ACTIVITY_FEED,
  buildPortfolioSummary,
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

/** Every dashboard figure narrows through here, so scope cannot be applied twice or missed. */
const scoped = async (scope: PlantScope) => scopeCases(await getCaseCorpus(), scope);
const openCases = async (scope: PlantScope) =>
  (await scoped(scope)).filter((c) => isOpenStatus(c.status));

/**
 * Every open corrective action in the tenant, as the dashboard's work list.
 *
 * The seeded list is keyed to fixture people and fixture cases; in database
 * mode it would put another organisation's work on the screen.
 */
async function storedOpenActions(): Promise<ActionItem[]> {
  const corpus = await getCaseCorpus();
  const actions = await findOpenActionsForTenant(DEFAULT_TENANT_ID, corpus);
  return actions;
}

/**
 * Which activity icon a stored audit event earns.
 *
 * Read from the rendered label rather than the dotted event key, because the
 * label is already the one place those words are decided. Anything unmatched
 * falls back to the neutral kind instead of guessing.
 */
function activityKindFor(action: string): ActivityEvent["kind"] {
  const text = action.toLowerCase();
  if (text.includes("created")) return "CASE_CREATED";
  if (text.includes("owner") || text.includes("assigned")) return "CASE_ASSIGNED";
  if (text.includes("approved")) return "VERIFICATION_APPROVED";
  if (text.includes("rejected") || text.includes("returned")) return "VERIFICATION_REJECTED";
  if (text.includes("verification")) return "VERIFICATION_SUBMITTED";
  if (text.includes("escalat")) return "CASE_ESCALATED";
  if (text.includes("closed")) return "CASE_CLOSED";
  if (text.includes("comment")) return "COMMENT_ADDED";
  if (text.includes("action")) return "ACTION_COMPLETED";
  return "SIGNAL_INGESTED";
}

function tail(series: TrendPoint[], count = SPARKLINE_POINTS): TrendPoint[] {
  return series.slice(-count);
}

/* ------------------------------------------------------------------ KPI band */

export async function getHeadlineKpis(scope: PlantScope = ALL_PLANTS): Promise<KpiCardModel[]> {
  const open = await openCases(scope);
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
      currency: getTenantConfig().currency,
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
  // The summary cites specific cases by number. Reading the fixture version
  // while the tiles beneath it count stored cases is how a client is shown a
  // paragraph about cases their queue does not contain.
  if (USE_DATABASE) {
    const [corpus, sites] = await Promise.all([getCaseCorpus(), getPlants()]);
    return buildPortfolioSummary(corpus, sites);
  }
  return EXECUTIVE_SUMMARY;
}

export async function getCriticalCases(limit = 5, scope: PlantScope = ALL_PLANTS): Promise<CaseListItem[]> {
  return (await openCases(scope))
    .filter((c) => c.priorityBand === "CRITICAL" || c.priorityBand === "HIGH")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, limit);
}

export async function getPlantHealth(): Promise<PlantHealth[]> {
  // The seeded series belongs to the demo organisation and names its sites.
  // In database mode the rollup is computed from the tenant's own cases, so
  // the panel shows the evaluator their plants rather than somebody else's.
  if (USE_DATABASE) {
    const [corpus, sites] = await Promise.all([getCaseCorpus(), getPlants()]);
    return sites
      .map((plant) => {
        const rollup = computePlantRollup(corpus, plant.code, DEMO_NOW);
        return {
          plant,
          // OTIF is measured by the enterprise data platform, not recomputed
          // here; the group series stands in until a per-plant feed exists.
          otifPct: OTIF_SERIES_90D[OTIF_SERIES_90D.length - 1]?.value ?? 0,
          otifDeltaPts: 0,
          openCases: rollup.openCases,
          criticalCases: rollup.criticalCases,
          revenueAtRisk: rollup.revenueAtRisk,
          slaAdherencePct: rollup.slaAdherencePct,
        };
      })
      .sort((a, b) => a.slaAdherencePct - b.slaAdherencePct);
  }
  return PLANT_HEALTH;
}

export async function getTodaysActions(limit = 5): Promise<ActionItem[]> {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  const source = USE_DATABASE ? await storedOpenActions() : TODAYS_ACTIONS;
  return [...source]
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
  // The stored trail is the real activity feed: every mutation writes an audit
  // row, so what shows here is what people actually did rather than a seeded
  // narrative about cases that may not exist in this environment.
  if (USE_DATABASE) {
    const entries = await findAuditForTenant(DEFAULT_TENANT_ID);
    return entries.slice(0, limit).map((entry) => ({
      id: entry.id,
      kind: activityKindFor(entry.action),
      // A null actor means the platform acted; the feed renders that as its own
      // voice rather than attributing an SLA timer to a person.
      actorName: entry.actorId === null ? null : entry.actorName,
      actorRole: entry.actorRole,
      caseNo: entry.caseNo,
      summary: `${entry.action} — ${entry.caseTitle}`,
      at: entry.at,
    }));
  }
  return ACTIVITY_FEED.slice(0, limit);
}

export async function getPriorityDistribution(scope: PlantScope = ALL_PLANTS): Promise<PriorityDistributionSlice[]> {
  const open = await openCases(scope);
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
  /* The seeded table belongs to the demo organisation and names its sites. In
   * database mode every figure here is read off the tenant's own inventory
   * cases instead — days of cover and the policy target from the measurement
   * the case is judged against, stockout risk and excess value counted from
   * the cases themselves. A plant with no inventory case is omitted rather
   * than shown at zero, because "no case" is not "no stock". */
  if (USE_DATABASE) {
    const [corpus, sites] = await Promise.all([getCaseCorpus(), getPlants()]);
    return sites.flatMap((plant) => {
      const atPlant = corpus.filter(
        (item) => item.plantCode === plant.code && item.kpiKey === "INVENTORY_DAYS",
      );
      if (atPlant.length === 0) return [];

      const latest = atPlant.reduce((newest, item) =>
        item.lastDetectedAt > newest.lastDetectedAt ? item : newest,
      );
      const inventoryDays = latest.baselineValue;
      const targetDays = latest.targetValue;

      return [
        {
          plantCode: plant.code,
          plantName: plant.name,
          inventoryDays,
          targetDays,
          stockoutRiskSkus: atPlant.filter(
            (item) => item.exceptionType === "INVENTORY_STOCKOUT" && isOpenStatus(item.status),
          ).length,
          excessValue: atPlant
            .filter((item) => item.exceptionType === "INVENTORY_EXCESS")
            .reduce((sum, item) => sum + item.revenueAtRisk, 0),
          status:
            inventoryDays < targetDays * 0.5
              ? ("AT_RISK" as const)
              : inventoryDays > targetDays * 1.5
                ? ("WATCH" as const)
                : ("HEALTHY" as const),
        },
      ];
    });
  }
  return INVENTORY_HEALTH;
}

export async function getExecutionMetrics(): Promise<ExecutionMetrics> {
  return EXECUTION_METRICS;
}

/**
 * The stored case list, used by the dashboard's reactive shell to re-derive
 * headline numbers against work done in the current session.
 */
export async function getCaseBaseline(scope: PlantScope = ALL_PLANTS): Promise<CaseListItem[]> {
  return scoped(scope);
}

/* ------------------------------------------------------------- Shell badges */

export async function getNavBadgeCounts(scope: PlantScope = ALL_PLANTS): Promise<Record<string, number>> {
  const open = await openCases(scope);
  return {
    unassigned: open.filter((c) => c.ownerId === null).length,
    myOpen: TODAYS_ACTIONS.filter((a) => a.status !== "DONE").length,
    approvals: open.filter((c) => c.status === "PENDING_VERIFY").length,
    breaches: open.filter((c) => c.slaBreachedAt !== null).length,
  };
}

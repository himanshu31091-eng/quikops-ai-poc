import type {
  ExecutionMetrics,
  InventoryHealthRow,
  PlantHealth,
  RevenueImpactBucket,
  TrendPoint,
} from "@/src/domain/types";
import { EXCEPTION_TYPES } from "@/src/domain/types";
import { isOpenStatus } from "@/src/domain/case-status";
import {
  computeExecutionMetrics,
  computePlantRollup,
} from "@/src/domain/portfolio-metrics";
import { DEMO_NOW, TREND_WINDOW_DAYS } from "@/src/lib/constants";
import { CASES } from "./cases";
import { PLANTS } from "./organisation";

const DAY_MS = 86_400_000;

/**
 * Deterministic pseudo-random generator (mulberry32). Trend lines need to look
 * organic but be byte-identical on every render and every rehearsal — a chart
 * that redraws differently on refresh destroys confidence in the numbers.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeriesOptions {
  seed: number;
  days: number;
  start: number;
  end: number;
  volatility: number;
  /** Optional mid-series dip to create a visible incident. */
  dip?: { atRatio: number; depth: number; widthDays: number };
}

function buildSeries({
  seed,
  days,
  start,
  end,
  volatility,
  dip,
}: SeriesOptions): TrendPoint[] {
  const rand = mulberry32(seed);
  const points: TrendPoint[] = [];

  for (let i = 0; i < days; i += 1) {
    const progress = i / (days - 1);
    let value = start + (end - start) * progress;

    // Weekly seasonality — manufacturing performance dips at week boundaries.
    value += Math.sin((i / 7) * Math.PI * 2) * volatility * 0.4;
    value += (rand() - 0.5) * volatility;

    if (dip) {
      const centre = dip.atRatio * (days - 1);
      const distance = Math.abs(i - centre);
      if (distance < dip.widthDays) {
        value -= dip.depth * (1 - distance / dip.widthDays);
      }
    }

    points.push({
      date: new Date(DEMO_NOW.getTime() - (days - 1 - i) * DAY_MS)
        .toISOString()
        .slice(0, 10),
      value: Math.round(value * 10) / 10,
    });
  }

  return points;
}

/* --------------------------------------------------------------- KPI series */

export const OTIF_SERIES_90D = buildSeries({
  seed: 20260805,
  days: TREND_WINDOW_DAYS,
  start: 93.8,
  end: 89.2,
  volatility: 1.6,
  dip: { atRatio: 0.86, depth: 2.4, widthDays: 9 },
});

export const REVENUE_AT_RISK_SERIES_90D = buildSeries({
  seed: 77120,
  days: TREND_WINDOW_DAYS,
  start: 512,
  end: 848,
  volatility: 46,
  dip: { atRatio: 0.5, depth: -60, widthDays: 12 },
});

export const OPEN_CRITICAL_SERIES_90D = buildSeries({
  seed: 44182,
  days: TREND_WINDOW_DAYS,
  start: 2.4,
  end: 4.2,
  volatility: 1.1,
});

export const SLA_BREACH_SERIES_90D = buildSeries({
  seed: 90014,
  days: TREND_WINDOW_DAYS,
  start: 4.1,
  end: 2.6,
  volatility: 1.2,
});

export const SCHEDULE_ADHERENCE_SERIES_90D = buildSeries({
  seed: 31190,
  days: TREND_WINDOW_DAYS,
  start: 88.4,
  end: 84.9,
  volatility: 2.1,
});

/* ------------------------------------------------------------- Plant health */

/**
 * On-time-in-full per plant, as measured by the enterprise data platform.
 *
 * Genuinely external: OTIF is computed by the analytics platform over its own
 * window against confirmed delivery data QuikOps does not hold. Reading it is
 * correct; recomputing it from the case list would be inventing a number.
 * Everything else on the plant-health row *is* derived — see below.
 */
const PLANT_OTIF: Record<string, { otifPct: number; otifDeltaPts: number }> = {
  // Vapi is the site the demo is about: worst OTIF, worst movement, and the
  // plant carrying the polymer-resin exposure.
  VP01: { otifPct: 87.0, otifDeltaPts: -4.1 },
  HY01: { otifPct: 91.4, otifDeltaPts: -1.2 },
  RK01: { otifPct: 94.6, otifDeltaPts: 0.9 },
};

/**
 * Plant health, derived from the case corpus.
 *
 * Open counts, critical counts, exposure and SLA adherence were hand-authored
 * and had drifted: two criticals were attributed to Querétaro when both sat at
 * Ingolstadt, and the live Copilot noticed the contradiction unprompted. They
 * are now computed by `src/domain/portfolio-metrics.ts`, the same module the
 * dashboard, the AI summary and Execution Analytics read, so the four can no
 * longer disagree.
 */
export const PLANT_HEALTH: PlantHealth[] = PLANTS.map((plant) => {
  const rollup = computePlantRollup(CASES, plant.code, DEMO_NOW);
  const otif = PLANT_OTIF[plant.code] ?? { otifPct: 0, otifDeltaPts: 0 };
  return {
    plant,
    otifPct: otif.otifPct,
    otifDeltaPts: otif.otifDeltaPts,
    openCases: rollup.openCases,
    criticalCases: rollup.criticalCases,
    revenueAtRisk: rollup.revenueAtRisk,
    slaAdherencePct: rollup.slaAdherencePct,
  };
}).sort((a, b) => a.otifPct - b.otifPct);

/* ----------------------------------------------------------- Revenue impact */

/**
 * Exposure and recovery by exception type, derived from the case corpus.
 *
 * Previously hand-authored, and it did not add up: the buckets totalled
 * $1,728,000 across 25 cases against a portfolio of $1,531,700 across 19 open
 * ones. The live Copilot found this by summing the block and comparing it with
 * the headline — which is exactly the check a client would run.
 *
 * `atRisk` counts open exposure; `recovered` counts cases that reached a
 * verified outcome, because verification is the only route to recovered revenue
 * (D-02). Empty buckets are dropped so the chart shows categories that exist.
 */
export const REVENUE_IMPACT: RevenueImpactBucket[] = EXCEPTION_TYPES.map((exceptionType) => {
  const ofType = CASES.filter((item) => item.exceptionType === exceptionType);
  const open = ofType.filter((item) => isOpenStatus(item.status));
  return {
    exceptionType,
    atRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    recovered: ofType
      .filter((item) => item.verifiedAt !== null)
      .reduce((sum, item) => sum + item.revenueAtRisk, 0),
    caseCount: open.length,
  };
})
  .filter((bucket) => bucket.caseCount > 0 || bucket.recovered > 0)
  .sort((a, b) => b.atRisk - a.atRisk);

/* --------------------------------------------------------- Inventory health */

export const INVENTORY_HEALTH: InventoryHealthRow[] = [
  {
    plantCode: "VP01",
    plantName: "Vapi",
    inventoryDays: 4.1,
    targetDays: 12,
    stockoutRiskSkus: 7,
    excessValue: 118_400,
    status: "AT_RISK",
  },
  {
    plantCode: "HY01",
    plantName: "Hyderabad",
    inventoryDays: 8.6,
    targetDays: 10,
    stockoutRiskSkus: 4,
    excessValue: 264_900,
    status: "WATCH",
  },
  {
    plantCode: "RK01",
    plantName: "Roorkee",
    inventoryDays: 26.4,
    targetDays: 28,
    stockoutRiskSkus: 2,
    excessValue: 481_200,
    status: "WATCH",
  },
];

/* -------------------------------------------------------- Execution metrics */

/**
 * Quarter-on-quarter movement.
 *
 * The only figures here that are not derived. A delta compares against a prior
 * period, and the corpus is a single snapshot — deriving these would mean
 * inventing the quarter they are measured against. Stored, and labelled as
 * stored, rather than computed from data that does not exist.
 */
const HISTORICAL_DELTAS = {
  mttrDeltaPct: -21.6,
  slaAdherenceDeltaPts: 4.2,
} as const;

/**
 * Execution performance, derived from the case corpus.
 *
 * Mean time to resolve, SLA adherence, verification pass rate, recurrence rate
 * and weekly throughput all come from `src/domain/portfolio-metrics.ts`. They
 * were previously asserted, and the assertions had drifted far enough that the
 * dashboard reported 86.4% adherence beside a KPI tile counting nine live
 * breaches.
 */
export const EXECUTION_METRICS: ExecutionMetrics = computeExecutionMetrics(
  CASES,
  DEMO_NOW,
  HISTORICAL_DELTAS,
);

import type {
  ExecutionMetrics,
  InventoryHealthRow,
  PlantHealth,
  RevenueImpactBucket,
  TrendPoint,
} from "@/src/domain/types";
import { DEMO_NOW, TREND_WINDOW_DAYS } from "@/src/lib/constants";
import { PLANT_BY_CODE } from "./organisation";

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

export const PLANT_HEALTH: PlantHealth[] = [
  {
    plant: PLANT_BY_CODE["MX01"]!,
    otifPct: 87.4,
    otifDeltaPts: -3.1,
    openCases: 8,
    criticalCases: 2,
    revenueAtRisk: 440_800,
    slaAdherencePct: 78.4,
  },
  {
    plant: PLANT_BY_CODE["US01"]!,
    otifPct: 92.1,
    otifDeltaPts: -1.4,
    openCases: 6,
    criticalCases: 1,
    revenueAtRisk: 434_900,
    slaAdherencePct: 86.2,
  },
  {
    plant: PLANT_BY_CODE["DE01"]!,
    otifPct: 91.7,
    otifDeltaPts: 0.8,
    openCases: 7,
    criticalCases: 1,
    revenueAtRisk: 458_100,
    slaAdherencePct: 89.5,
  },
  {
    plant: PLANT_BY_CODE["IN01"]!,
    otifPct: 94.2,
    otifDeltaPts: 1.6,
    openCases: 4,
    criticalCases: 0,
    revenueAtRisk: 202_600,
    slaAdherencePct: 91.8,
  },
];

/* ----------------------------------------------------------- Revenue impact */

export const REVENUE_IMPACT: RevenueImpactBucket[] = [
  { exceptionType: "VENDOR_DELAY", atRisk: 430_500, recovered: 162_000, caseCount: 6 },
  { exceptionType: "CAPACITY_CONSTRAINT", atRisk: 402_400, recovered: 88_600, caseCount: 3 },
  { exceptionType: "MATERIAL_SHORTAGE", atRisk: 272_600, recovered: 129_800, caseCount: 3 },
  { exceptionType: "QUALITY_HOLD", atRisk: 155_100, recovered: 71_400, caseCount: 3 },
  { exceptionType: "INVENTORY_STOCKOUT", atRisk: 150_100, recovered: 34_200, caseCount: 2 },
  { exceptionType: "DELIVERY_AT_RISK", atRisk: 134_300, recovered: 41_900, caseCount: 3 },
  { exceptionType: "PLANNING_DEVIATION", atRisk: 117_500, recovered: 26_700, caseCount: 3 },
  { exceptionType: "INVENTORY_EXCESS", atRisk: 65_500, recovered: 48_300, caseCount: 2 },
];

/* --------------------------------------------------------- Inventory health */

export const INVENTORY_HEALTH: InventoryHealthRow[] = [
  {
    plantCode: "IN01",
    plantName: "Pune",
    inventoryDays: 4.1,
    targetDays: 12,
    stockoutRiskSkus: 7,
    excessValue: 118_400,
    status: "AT_RISK",
  },
  {
    plantCode: "DE01",
    plantName: "Ingolstadt",
    inventoryDays: 8.6,
    targetDays: 10,
    stockoutRiskSkus: 4,
    excessValue: 264_900,
    status: "WATCH",
  },
  {
    plantCode: "MX01",
    plantName: "Querétaro",
    inventoryDays: 26.4,
    targetDays: 28,
    stockoutRiskSkus: 2,
    excessValue: 481_200,
    status: "WATCH",
  },
  {
    plantCode: "US01",
    plantName: "Greenville",
    inventoryDays: 31.8,
    targetDays: 30,
    stockoutRiskSkus: 1,
    excessValue: 196_700,
    status: "HEALTHY",
  },
];

/* -------------------------------------------------------- Execution metrics */

export const EXECUTION_METRICS: ExecutionMetrics = {
  mttrHours: 38.4,
  mttrDeltaPct: -21.6,
  slaAdherencePct: 86.4,
  slaAdherenceDeltaPts: 4.2,
  verificationPassRatePct: 91.3,
  recurrenceRatePct: 14.8,
  casesClosedThisWeek: 11,
  casesOpenedThisWeek: 14,
};

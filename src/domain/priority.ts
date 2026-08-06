import type { CustomerTier, PriorityBand, PriorityFactor } from "./types";
import { formatMoney, formatPercent } from "../lib/format";

/**
 * Deterministic priority scoring. Rule-based on purpose: executives have to be
 * able to defend prioritisation in a review, and an unexplainable priority is an
 * ignored priority. AI may suggest an adjustment; it never sets the number.
 *
 * Weights are deployment-configurable and versioned.
 */
export const PRIORITY_WEIGHTS = {
  revenueAtRisk: 35,
  kpiDeviation: 26,
  customerTier: 15,
  urgency: 12,
  recurrence: 8,
  escalation: 4,
} as const;

const REVENUE_SATURATION = 250_000;
const KPI_DEVIATION_SATURATION_PTS = 12;
const RECURRENCE_SATURATION = 6;

const TIER_MULTIPLIER: Record<CustomerTier, number> = {
  TIER_1: 1,
  TIER_2: 0.55,
  TIER_3: 0.2,
};

const BAND_THRESHOLDS: { min: number; band: PriorityBand }[] = [
  { min: 75, band: "CRITICAL" },
  { min: 55, band: "HIGH" },
  { min: 32, band: "MEDIUM" },
  { min: 0, band: "LOW" },
];

export interface PriorityInput {
  revenueAtRisk: number;
  /** Positive points below target, e.g. target 95 vs actual 87.4 => 7.6 */
  kpiDeviationPts: number;
  customerTier: CustomerTier | null;
  /** Negative when the promised date has already passed. */
  daysToPromisedDate: number;
  recurrenceCount: number;
  escalationLevel: number;
}

export interface PriorityResult {
  score: number;
  band: PriorityBand;
  factors: PriorityFactor[];
}

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);
const round1 = (value: number): number => Math.round(value * 10) / 10;

export function computePriority(input: PriorityInput): PriorityResult {
  const revenueRatio = clamp01(input.revenueAtRisk / REVENUE_SATURATION);
  const deviationRatio = clamp01(input.kpiDeviationPts / KPI_DEVIATION_SATURATION_PTS);
  const tierRatio = input.customerTier ? TIER_MULTIPLIER[input.customerTier] : 0;
  const urgencyRatio =
    input.daysToPromisedDate <= 0
      ? 1
      : clamp01(1 - input.daysToPromisedDate / 14);
  const recurrenceRatio = clamp01(
    Math.log(1 + input.recurrenceCount) / Math.log(1 + RECURRENCE_SATURATION),
  );
  const escalationRatio = clamp01(input.escalationLevel / 3);

  const factors: PriorityFactor[] = [
    {
      factor: "Revenue at risk",
      raw: formatMoney(input.revenueAtRisk, "USD"),
      weighted: round1(revenueRatio * PRIORITY_WEIGHTS.revenueAtRisk),
    },
    {
      factor: "KPI deviation",
      raw: `-${formatPercent(input.kpiDeviationPts)} vs target`,
      weighted: round1(deviationRatio * PRIORITY_WEIGHTS.kpiDeviation),
    },
    {
      factor: "Customer tier",
      raw: input.customerTier ? input.customerTier.replace("_", " ") : "None",
      weighted: round1(tierRatio * PRIORITY_WEIGHTS.customerTier),
    },
    {
      factor: "Days to promised date",
      raw:
        input.daysToPromisedDate <= 0
          ? `${Math.abs(input.daysToPromisedDate)}d overdue`
          : `${input.daysToPromisedDate}d`,
      weighted: round1(urgencyRatio * PRIORITY_WEIGHTS.urgency),
    },
    {
      factor: "Recurrence",
      raw: `${input.recurrenceCount} detection${input.recurrenceCount === 1 ? "" : "s"}`,
      weighted: round1(recurrenceRatio * PRIORITY_WEIGHTS.recurrence),
    },
  ];

  if (input.escalationLevel > 0) {
    factors.push({
      factor: "Escalation",
      raw: `Level ${input.escalationLevel}`,
      weighted: round1(escalationRatio * PRIORITY_WEIGHTS.escalation),
    });
  }

  const score = round1(factors.reduce((sum, f) => sum + f.weighted, 0));
  const band = BAND_THRESHOLDS.find((t) => score >= t.min)?.band ?? "LOW";

  return { score, band, factors };
}

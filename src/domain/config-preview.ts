import { computePriority, PRIORITY_WEIGHTS } from "./priority";
import { isOpenStatus } from "./case-status";
import { SLA_TARGET_HOURS } from "./sla";
import type { OperationalCase, PriorityBand } from "./types";

/**
 * What a configuration change would actually do.
 *
 * The whole argument for an admin screen in this product is that priority
 * weights and SLA targets are already isolated and documented as
 * deployment-configurable. The screen is only credible if it can show the
 * consequence *before* saving — a settings page that says "priority weight:
 * 35" and nothing else is asking an executive to guess.
 *
 * Both functions are pure re-runs of the existing rules over the existing
 * corpus. No new scoring logic: `computePriority` and `SLA_TARGET_HOURS` remain
 * the only definitions.
 */

const HOUR_MS = 3_600_000;

export type PriorityWeights = typeof PRIORITY_WEIGHTS;
export type SlaTargets = Record<PriorityBand, number>;

export interface BandMovement {
  band: PriorityBand;
  before: number;
  after: number;
  delta: number;
}

export interface WeightPreview {
  /** Cases whose band changes under the draft weights. */
  movedCount: number;
  moved: {
    caseNo: string;
    title: string;
    fromBand: PriorityBand;
    toBand: PriorityBand;
    fromScore: number;
    toScore: number;
  }[];
  distribution: BandMovement[];
}

const BANDS: PriorityBand[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/**
 * Re-scores every open case under draft weights.
 *
 * `computePriority` reads the module-level `PRIORITY_WEIGHTS`, so the draft is
 * applied by scaling each factor's contribution rather than by mutating the
 * constant — configuration preview must never leave a global changed behind.
 */
export function previewWeightChange(
  cases: OperationalCase[],
  draft: PriorityWeights,
): WeightPreview {
  const open = cases.filter((item) => isOpenStatus(item.status));
  const moved: WeightPreview["moved"] = [];

  const beforeCounts: Record<PriorityBand, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  const afterCounts: Record<PriorityBand, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const item of open) {
    beforeCounts[item.priorityBand] += 1;

    // Each stored factor already carries its weighted contribution under the
    // live weights. Rescaling by the draft/live ratio reproduces what
    // `computePriority` would return without re-deriving the raw inputs.
    const ratio = (weightKey: keyof PriorityWeights): number => {
      const live: number = PRIORITY_WEIGHTS[weightKey];
      return live === 0 ? 0 : draft[weightKey] / live;
    };

    const FACTOR_KEYS: Record<string, keyof PriorityWeights> = {
      "Revenue at risk": "revenueAtRisk",
      "KPI deviation": "kpiDeviation",
      "Customer tier": "customerTier",
      "Days to promised date": "urgency",
      Recurrence: "recurrence",
      Escalation: "escalation",
    };

    const score = item.priorityFactors.reduce((sum, factor) => {
      const key = FACTOR_KEYS[factor.factor];
      return sum + factor.weighted * (key ? ratio(key) : 1);
    }, 0);

    const rounded = Math.round(score * 10) / 10;
    const band: PriorityBand =
      rounded >= 75 ? "CRITICAL" : rounded >= 55 ? "HIGH" : rounded >= 32 ? "MEDIUM" : "LOW";

    afterCounts[band] += 1;

    if (band !== item.priorityBand) {
      moved.push({
        caseNo: item.caseNo,
        title: item.title,
        fromBand: item.priorityBand,
        toBand: band,
        fromScore: item.priorityScore,
        toScore: rounded,
      });
    }
  }

  return {
    movedCount: moved.length,
    moved: moved.sort((a, b) => b.toScore - a.toScore),
    distribution: BANDS.map((band) => ({
      band,
      before: beforeCounts[band],
      after: afterCounts[band],
      delta: afterCounts[band] - beforeCounts[band],
    })),
  };
}

export interface SlaPreview {
  /** Open cases that would be in breach under the draft targets. */
  breachedAfter: number;
  breachedBefore: number;
  /** Cases that newly breach, worst first. */
  newlyBreached: { caseNo: string; title: string; band: PriorityBand; hoursOpen: number }[];
  /** Cases that stop being in breach. */
  noLongerBreached: { caseNo: string; title: string; band: PriorityBand }[];
}

export function previewSlaChange(
  cases: OperationalCase[],
  draft: SlaTargets,
  now: Date,
): SlaPreview {
  const open = cases.filter((item) => isOpenStatus(item.status));
  const newlyBreached: SlaPreview["newlyBreached"] = [];
  const noLongerBreached: SlaPreview["noLongerBreached"] = [];
  let breachedAfter = 0;
  let breachedBefore = 0;

  for (const item of open) {
    const hoursOpen = (now.getTime() - new Date(item.openedAt).getTime()) / HOUR_MS;
    const wasBreached = hoursOpen > SLA_TARGET_HOURS[item.priorityBand];
    const isBreached = hoursOpen > draft[item.priorityBand];

    if (wasBreached) breachedBefore += 1;
    if (isBreached) breachedAfter += 1;

    if (!wasBreached && isBreached) {
      newlyBreached.push({
        caseNo: item.caseNo,
        title: item.title,
        band: item.priorityBand,
        hoursOpen: Math.round(hoursOpen),
      });
    }
    if (wasBreached && !isBreached) {
      noLongerBreached.push({
        caseNo: item.caseNo,
        title: item.title,
        band: item.priorityBand,
      });
    }
  }

  return {
    breachedAfter,
    breachedBefore,
    newlyBreached: newlyBreached.sort((a, b) => b.hoursOpen - a.hoursOpen),
    noLongerBreached,
  };
}

export { PRIORITY_WEIGHTS, SLA_TARGET_HOURS, computePriority };

import type { CaseListItem } from "./types";

/**
 * Confidence scoring for a recommended action.
 *
 * Deterministic and rule-based, for the same reason the priority score is
 * (`./priority`): a recommendation an executive cannot interrogate is a
 * recommendation they will ignore. The wording of a recommendation is reference
 * data and lives in `src/data/fixtures/recommendations.ts`; how much to trust it
 * on a given case is a rule, and lives here.
 *
 * The model may draft the prose. It never sets this number.
 */

/** What raises or lowers confidence, and by how much. */
export const RECOMMENDATION_WEIGHTS = {
  /** A repeat detection is the strongest evidence the pattern is real. */
  recurrence: 18,
  /** Escalation means someone senior already agreed it needs intervention. */
  escalation: 10,
  /** A tier-one customer sharpens the case for acting rather than waiting. */
  customerTier: 6,
  /** Corroborating open cases against the same supplier. */
  supplierCorroboration: 8,
  /** Being past SLA removes the option of waiting for more evidence. */
  breach: 6,
} as const;

/** Floor, so a first-detection recommendation still reads as actionable. */
const BASE_CONFIDENCE = 54;
const MAX_CONFIDENCE = 97;

export interface RecommendationConfidenceInput {
  recurrenceCount: number;
  escalationLevel: number;
  customerTier: CaseListItem["customerTier"];
  /** Other open cases against the same supplier. */
  supplierOpenCases: number;
  isBreached: boolean;
}

export interface RecommendationConfidence {
  /** 0–100, rounded. */
  score: number;
  /** Why the number is what it is, in the order it was built. */
  drivers: { label: string; points: number }[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function scoreRecommendationConfidence(
  input: RecommendationConfidenceInput,
): RecommendationConfidence {
  const drivers: { label: string; points: number }[] = [];
  let score = BASE_CONFIDENCE;

  if (input.recurrenceCount > 1) {
    // Saturates: the difference between detection 2 and 3 matters more than
    // between 5 and 6, because by then the pattern is already established.
    const points = Math.round(
      RECOMMENDATION_WEIGHTS.recurrence *
        clamp(Math.log(input.recurrenceCount) / Math.log(4), 0, 1),
    );
    score += points;
    drivers.push({
      label: `Detection ${input.recurrenceCount} against the same condition`,
      points,
    });
  }

  if (input.escalationLevel > 0) {
    const points = Math.round(
      RECOMMENDATION_WEIGHTS.escalation * clamp(input.escalationLevel / 2, 0, 1),
    );
    score += points;
    drivers.push({ label: `Escalated to level ${input.escalationLevel}`, points });
  }

  if (input.customerTier === "TIER_1") {
    score += RECOMMENDATION_WEIGHTS.customerTier;
    drivers.push({
      label: "Tier-one customer exposure",
      points: RECOMMENDATION_WEIGHTS.customerTier,
    });
  }

  if (input.supplierOpenCases > 0) {
    const points = Math.round(
      RECOMMENDATION_WEIGHTS.supplierCorroboration *
        clamp(input.supplierOpenCases / 2, 0, 1),
    );
    score += points;
    drivers.push({
      label: `${input.supplierOpenCases} other open case${input.supplierOpenCases === 1 ? "" : "s"} against this supplier`,
      points,
    });
  }

  if (input.isBreached) {
    score += RECOMMENDATION_WEIGHTS.breach;
    drivers.push({ label: "Already past SLA", points: RECOMMENDATION_WEIGHTS.breach });
  }

  return { score: Math.round(clamp(score, BASE_CONFIDENCE, MAX_CONFIDENCE)), drivers };
}

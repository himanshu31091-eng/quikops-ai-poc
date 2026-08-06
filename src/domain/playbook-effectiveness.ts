import { isOpenStatus } from "./case-status";
import { resolutionHoursOf, hasBreachedSla } from "./portfolio-metrics";
import type { OperationalCase } from "./types";

/**
 * How well a playbook actually works.
 *
 * The library is only worth having if it can say which plays hold and which
 * merely feel thorough. Scored from the cases that ran each playbook, using the
 * same resolution and breach definitions as everything else
 * (`./portfolio-metrics`), so a playbook's numbers reconcile with the dashboard.
 *
 * ⚠️ Sample sizes here are small — a handful of cases per playbook. Every figure
 * is returned alongside `sampleSize` and callers are expected to show it. A
 * percentage over four cases that does not say "of four" is a lie of omission.
 */

export interface PlaybookEffectiveness {
  /** Cases that ran this playbook. */
  sampleSize: number;
  resolvedCount: number;
  openCount: number;
  /** Mean opened-to-resolved hours. Null when nothing has resolved. */
  meanResolutionHours: number | null;
  /** Share of its cases that never breached. Null on an empty sample. */
  slaAdherencePct: number | null;
  /** Share of its cases that were a repeat detection. */
  recurrenceRatePct: number | null;
  /** Exposure still open on cases running this playbook. */
  openRevenueAtRisk: number;
  /**
   * 0–100 composite, or null when the sample is too small to rank.
   * Adherence carries it; recurrence is a penalty, because a play that closes
   * cases quickly and lets them come back has not worked.
   */
  score: number | null;
}

/** Below this, a percentage is noise and the playbook is left unranked. */
export const MIN_RANKABLE_SAMPLE = 3;

export function scorePlaybookEffectiveness(
  cases: OperationalCase[],
  now: Date,
): PlaybookEffectiveness {
  if (cases.length === 0) {
    return {
      sampleSize: 0,
      resolvedCount: 0,
      openCount: 0,
      meanResolutionHours: null,
      slaAdherencePct: null,
      recurrenceRatePct: null,
      openRevenueAtRisk: 0,
      score: null,
    };
  }

  const open = cases.filter((item) => isOpenStatus(item.status));
  const resolutions = cases
    .map(resolutionHoursOf)
    .filter((hours): hours is number => hours !== null);

  const adherence =
    ((cases.length - cases.filter((item) => hasBreachedSla(item, now)).length) /
      cases.length) *
    100;
  const recurrence =
    (cases.filter((item) => item.recurrenceCount > 1).length / cases.length) * 100;

  const round1 = (value: number): number => Math.round(value * 10) / 10;

  return {
    sampleSize: cases.length,
    resolvedCount: resolutions.length,
    openCount: open.length,
    meanResolutionHours:
      resolutions.length === 0
        ? null
        : round1(resolutions.reduce((sum, hours) => sum + hours, 0) / resolutions.length),
    slaAdherencePct: round1(adherence),
    recurrenceRatePct: round1(recurrence),
    openRevenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    score:
      cases.length < MIN_RANKABLE_SAMPLE
        ? null
        : Math.max(0, Math.round(adherence - recurrence * 0.5)),
  };
}

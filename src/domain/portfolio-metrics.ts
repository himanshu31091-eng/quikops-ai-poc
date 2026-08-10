import { isOpenStatus } from "./case-status";
import { SLA_TARGET_HOURS } from "./sla";
import type { ExecutionMetrics, OperationalCase, PriorityBand } from "./types";

/**
 * Portfolio figures, derived from the case corpus.
 *
 * The single source of truth for every headline number in the product. Before
 * this module existed, the dashboard, the plant-health table, the AI summary and
 * Execution Analytics each computed — or hand-authored — their own version, and
 * they disagreed: the summary claimed two unassigned critical cases at a plant
 * that had none, plant health attributed criticals to the wrong sites, and the
 * stored 86.4% SLA adherence sat beside a KPI tile reporting nine live
 * breaches.
 *
 * Everything measurable from a case is computed here and nowhere else.
 *
 * What is deliberately *not* derived:
 *   - OTIF, inventory days and schedule adherence are measured by the platform
 *     over its own window. QuikOps reads them; it does not recompute them.
 *   - Period-over-period deltas need a prior period. The corpus is a single
 *     snapshot, so deltas remain stored historical comparisons and are labelled
 *     as such at their definition.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/* ------------------------------------------------------------- Definitions */

/** When a case reached a terminal outcome. Null while it is still open. */
export function resolvedAtOf(item: OperationalCase): string | null {
  return item.verifiedAt ?? item.closedAt;
}

/** Hours from detection to resolution. Null while the case is still open. */
export function resolutionHoursOf(item: OperationalCase): number | null {
  const resolvedAt = resolvedAtOf(item);
  if (resolvedAt === null) return null;
  return (new Date(resolvedAt).getTime() - new Date(item.openedAt).getTime()) / HOUR_MS;
}

/**
 * The one definition of an SLA breach in the product.
 *
 * A resolved case breached if it took longer than its band's target. An open
 * case has breached once the target has passed without resolution. Both halves
 * matter: counting only resolved cases lets a permanently-open case escape
 * measurement, and counting only open ones erases history.
 */
export function hasBreachedSla(item: OperationalCase, now: Date): boolean {
  const target = SLA_TARGET_HOURS[item.priorityBand];
  const resolutionHours = resolutionHoursOf(item);
  if (resolutionHours !== null) return resolutionHours > target;
  return now.getTime() - new Date(item.openedAt).getTime() > target * HOUR_MS;
}

/**
 * Share of cases that have not breached their target.
 *
 * Used identically at portfolio, plant and filtered-selection level, so the
 * three can never contradict one another. Null for an empty set rather than
 * 100%, because "nothing has gone wrong yet" and "there is nothing to measure"
 * are different answers.
 */
export function slaAdherencePct(items: OperationalCase[], now: Date): number | null {
  if (items.length === 0) return null;
  const breached = items.filter((item) => hasBreachedSla(item, now)).length;
  return ((items.length - breached) / items.length) * 100;
}

/** Mean hours from detection to resolution, across resolved cases only. */
export function meanResolutionHours(items: OperationalCase[]): number | null {
  const resolved = items
    .map(resolutionHoursOf)
    .filter((hours): hours is number => hours !== null);
  if (resolved.length === 0) return null;
  return resolved.reduce((sum, hours) => sum + hours, 0) / resolved.length;
}

/**
 * Approved as a share of everything that reached a reviewer. A case sitting in
 * `PENDING_VERIFY` counts in the denominator — it has been submitted — so the
 * rate cannot be flattered by leaving work unreviewed.
 */
export function verificationPassRatePct(items: OperationalCase[]): number | null {
  const submitted = items.filter(
    (item) => item.verifiedAt !== null || item.status === "PENDING_VERIFY",
  );
  if (submitted.length === 0) return null;
  const approved = submitted.filter((item) => item.verifiedAt !== null).length;
  return (approved / submitted.length) * 100;
}

/** Share of cases that are a second or later detection of the same condition. */
export function recurrenceRatePct(items: OperationalCase[]): number | null {
  if (items.length === 0) return null;
  return (items.filter((item) => item.recurrenceCount > 1).length / items.length) * 100;
}

/* ----------------------------------------------------------------- Rollups */

export interface PortfolioCounts {
  total: number;
  open: number;
  openCritical: number;
  openHigh: number;
  breached: number;
  unassigned: number;
  pendingVerification: number;
  recurring: number;
  escalated: number;
  revenueAtRisk: number;
}

export function portfolioCounts(items: OperationalCase[], now: Date): PortfolioCounts {
  const open = items.filter((item) => isOpenStatus(item.status));
  return {
    total: items.length,
    open: open.length,
    openCritical: open.filter((item) => item.priorityBand === "CRITICAL").length,
    openHigh: open.filter((item) => item.priorityBand === "HIGH").length,
    // Breaches are reported against open work: a manager acts on what is still
    // late, not on what was late and has since been closed.
    breached: open.filter((item) => hasBreachedSla(item, now)).length,
    unassigned: open.filter((item) => item.ownerId === null).length,
    pendingVerification: open.filter((item) => item.status === "PENDING_VERIFY").length,
    recurring: open.filter((item) => item.recurrenceCount > 1).length,
    escalated: open.filter((item) => item.escalationLevel > 0).length,
    revenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
  };
}

/** Cases opened and resolved inside the trailing seven days. */
export function weeklyThroughput(
  items: OperationalCase[],
  now: Date,
): { opened: number; closed: number } {
  const cutoff = now.getTime() - 7 * DAY_MS;
  return {
    opened: items.filter((item) => new Date(item.openedAt).getTime() >= cutoff).length,
    closed: items.filter((item) => {
      const resolvedAt = resolvedAtOf(item);
      return resolvedAt !== null && new Date(resolvedAt).getTime() >= cutoff;
    }).length,
  };
}

/**
 * Execution performance for the whole corpus.
 *
 * `mttrDeltaPct` and `slaAdherenceDeltaPts` are supplied by the caller rather
 * than computed: they compare against a prior quarter that this snapshot does
 * not contain, so deriving them would mean inventing history.
 */
export function computeExecutionMetrics(
  items: OperationalCase[],
  now: Date,
  historicalDeltas: { mttrDeltaPct: number; slaAdherenceDeltaPts: number },
): ExecutionMetrics {
  const throughput = weeklyThroughput(items, now);
  const round1 = (value: number | null): number =>
    value === null ? 0 : Math.round(value * 10) / 10;

  return {
    mttrHours: round1(meanResolutionHours(items)),
    mttrDeltaPct: historicalDeltas.mttrDeltaPct,
    slaAdherencePct: round1(slaAdherencePct(items, now)),
    slaAdherenceDeltaPts: historicalDeltas.slaAdherenceDeltaPts,
    verificationPassRatePct: round1(verificationPassRatePct(items)),
    recurrenceRatePct: round1(recurrenceRatePct(items)),
    casesClosedThisWeek: throughput.closed,
    casesOpenedThisWeek: throughput.opened,
  };
}

/** Per-plant figures, using the same definitions as the portfolio rollup. */
export interface PlantRollup {
  openCases: number;
  criticalCases: number;
  revenueAtRisk: number;
  slaAdherencePct: number;
}

export function computePlantRollup(
  items: OperationalCase[],
  plantCode: string,
  now: Date,
): PlantRollup {
  const atPlant = items.filter((item) => item.plantCode === plantCode);
  const open = atPlant.filter((item) => isOpenStatus(item.status));

  return {
    openCases: open.length,
    criticalCases: open.filter((item) => item.priorityBand === "CRITICAL").length,
    revenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    slaAdherencePct: Math.round((slaAdherencePct(atPlant, now) ?? 0) * 10) / 10,
  };
}

/** The plant carrying the most open critical work, then the most exposure. */
export function worstPlantCode(items: OperationalCase[], plantCodes: string[], now: Date): string | null {
  const ranked = plantCodes
    .map((code) => ({ code, ...computePlantRollup(items, code, now) }))
    .filter((entry) => entry.openCases > 0)
    .sort(
      (a, b) =>
        a.slaAdherencePct - b.slaAdherencePct ||
        b.criticalCases - a.criticalCases ||
        b.revenueAtRisk - a.revenueAtRisk,
    );
  return ranked[0]?.code ?? null;
}

/** Open cases by band, for a distribution chart or a summary sentence. */
export function openCountByBand(
  items: OperationalCase[],
): Record<PriorityBand, number> {
  const open = items.filter((item) => isOpenStatus(item.status));
  return {
    CRITICAL: open.filter((item) => item.priorityBand === "CRITICAL").length,
    HIGH: open.filter((item) => item.priorityBand === "HIGH").length,
    MEDIUM: open.filter((item) => item.priorityBand === "MEDIUM").length,
    LOW: open.filter((item) => item.priorityBand === "LOW").length,
  };
}

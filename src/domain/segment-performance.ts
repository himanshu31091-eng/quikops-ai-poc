import { isOpenStatus } from "./case-status";
import { hasBreachedSla, meanResolutionHours, slaAdherencePct } from "./portfolio-metrics";
import type { CustomerTier, OperationalCase } from "./types";

/**
 * Performance by commercial segment and by escalation depth.
 *
 * Two questions the portfolio metrics cannot answer, both derivable from fields
 * the case already carries — `customerCode`, `customerTier` and
 * `escalationLevel` — so neither needs a schema change or a new fixture.
 *
 * **Customer.** `customerTier` already feeds the priority score, which means the
 * product has always known that a tier-one account matters more; it has never
 * been able to say *which accounts are actually exposed*. Concentration is the
 * finding: an operation with the same total exposure spread across forty
 * customers is in a different position from one carrying it on three.
 *
 * **Escalation.** `escalationLevel` is an integer that feeds priority and health
 * and is otherwise invisible. It is the only signal in the corpus for work that
 * has been pushed above its owner, and the useful reading of it is not the count
 * but the *age*: an escalation that is a day old is a hand-off, and one that is
 * three weeks old is a queue nobody owns.
 *
 * Framework-free, `now` passed in, nothing stored — the same contract as
 * `portfolio-metrics` and `flow-balance`, and it reuses their definitions of
 * open, breached and resolved rather than restating them.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/* ------------------------------------------------------------- Customer --- */

export interface CustomerPerformance {
  code: string;
  name: string;
  tier: CustomerTier | null;
  /** Every case ever raised against this customer. */
  totalCases: number;
  openCases: number;
  breachedOpen: number;
  openExposure: number;
  /** Share of the portfolio's total open exposure, in percent. */
  exposureSharePct: number;
  slaAdherencePct: number;
  /** Null when nothing has been resolved for this customer yet. */
  meanResolutionHours: number | null;
  /** Cases detected more than once — the same condition returning. */
  recurringCases: number;
  /** Worst open case, by the deterministic priority score. */
  topCaseNo: string | null;
}

export interface CustomerConcentration {
  customers: CustomerPerformance[];
  /** Share of open exposure carried by the top three accounts. */
  topThreeSharePct: number;
  /** How many accounts it takes to reach half the open exposure. */
  accountsToHalfExposure: number;
  totalOpenExposure: number;
}

/**
 * Exposure by customer, worst first, with the concentration figures.
 *
 * Cases with no customer are excluded rather than bucketed as "unknown": an
 * inventory-excess case genuinely has no customer, and a row labelled unknown
 * sitting at the top of a customer table is a data-quality question dressed up
 * as a business finding.
 */
export function customerPerformance(
  cases: OperationalCase[],
  now: Date,
): CustomerConcentration {
  const grouped = new Map<string, OperationalCase[]>();
  for (const item of cases) {
    if (item.customerCode === null) continue;
    const bucket = grouped.get(item.customerCode);
    if (bucket) bucket.push(item);
    else grouped.set(item.customerCode, [item]);
  }

  const totalOpenExposure = cases
    .filter((item) => isOpenStatus(item.status))
    .reduce((sum, item) => sum + item.revenueAtRisk, 0);

  const customers: CustomerPerformance[] = [];
  for (const [code, items] of grouped) {
    const open = items.filter((item) => isOpenStatus(item.status));
    const openExposure = open.reduce((sum, item) => sum + item.revenueAtRisk, 0);
    const worst = [...open].sort((a, b) => b.priorityScore - a.priorityScore)[0];

    customers.push({
      code,
      name: items[0]?.customerName ?? code,
      tier: items[0]?.customerTier ?? null,
      totalCases: items.length,
      openCases: open.length,
      breachedOpen: open.filter((item) => hasBreachedSla(item, now)).length,
      openExposure,
      exposureSharePct:
        totalOpenExposure === 0 ? 0 : (openExposure / totalOpenExposure) * 100,
      slaAdherencePct: slaAdherencePct(items, now) ?? 0,
      meanResolutionHours: meanResolutionHours(items),
      recurringCases: items.filter((item) => item.recurrenceCount > 1).length,
      topCaseNo: worst?.caseNo ?? null,
    });
  }

  customers.sort((a, b) => b.openExposure - a.openExposure || b.openCases - a.openCases);

  const topThree = customers.slice(0, 3).reduce((sum, entry) => sum + entry.openExposure, 0);

  let running = 0;
  let accountsToHalfExposure = 0;
  for (const entry of customers) {
    if (running >= totalOpenExposure / 2) break;
    running += entry.openExposure;
    accountsToHalfExposure += 1;
  }

  return {
    customers,
    topThreeSharePct: totalOpenExposure === 0 ? 0 : (topThree / totalOpenExposure) * 100,
    accountsToHalfExposure,
    totalOpenExposure,
  };
}

/* ----------------------------------------------------------- Escalation --- */

/**
 * How long a case has been above its owner.
 *
 * The corpus records that a case *is* escalated but not *when* it was, so this
 * measures from the SLA breach where there is one and from detection otherwise
 * — breaching is what escalates a case (`src/domain/sla.ts`), so the breach
 * moment is the best available proxy and the only honest one.
 *
 * It is a floor, not a measurement: a case escalated by hand before it breached
 * has been escalated for longer than this says. The UI states that rather than
 * presenting the figure as exact.
 */
export function daysInEscalation(item: OperationalCase, now: Date): number | null {
  if (item.escalationLevel <= 0) return null;
  const from = item.slaBreachedAt ?? item.openedAt;
  return Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / DAY_MS));
}

export interface EscalationLevelBand {
  level: number;
  label: string;
  openCases: number;
  exposure: number;
  /** Mean days above the owner, across the open cases at this level. */
  meanDays: number | null;
  /** Open, escalated and past target — the compounding failure. */
  breachedOpen: number;
}

export interface EscalationAnalytics {
  bands: EscalationLevelBand[];
  totalEscalatedOpen: number;
  totalEscalatedExposure: number;
  /** Share of open cases that have been pushed above their owner. */
  escalationRatePct: number;
  /** The longest-running open escalation, which is the one to ask about. */
  oldest: { caseNo: string; days: number; exposure: number } | null;
  /** Escalated, past target, and still unowned — the worst combination. */
  unownedEscalated: number;
  /** Mean days in escalation across every open escalated case. */
  meanDays: number | null;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Raised to the manager",
  2: "Raised to the plant lead",
  3: "Raised to the executive sponsor",
};

/**
 * Escalation depth, exposure and age.
 *
 * Banded by level rather than listed, because the question a director asks is
 * not *which cases are escalated* — the queue answers that — but *how far up is
 * this having to go, and for how long*. Three cases at level three is a
 * different problem from thirty at level one.
 */
export function escalationAnalytics(
  cases: OperationalCase[],
  now: Date,
): EscalationAnalytics {
  const open = cases.filter((item) => isOpenStatus(item.status));
  const escalated = open.filter((item) => item.escalationLevel > 0);

  const levels = [...new Set(escalated.map((item) => item.escalationLevel))].sort(
    (a, b) => b - a,
  );

  const bands: EscalationLevelBand[] = levels.map((level) => {
    const items = escalated.filter((item) => item.escalationLevel === level);
    const ages = items
      .map((item) => daysInEscalation(item, now))
      .filter((days): days is number => days !== null);

    return {
      level,
      label: LEVEL_LABELS[level] ?? `Level ${level}`,
      openCases: items.length,
      exposure: items.reduce((sum, item) => sum + item.revenueAtRisk, 0),
      meanDays:
        ages.length === 0
          ? null
          : Math.round((ages.reduce((sum, days) => sum + days, 0) / ages.length) * 10) / 10,
      breachedOpen: items.filter((item) => hasBreachedSla(item, now)).length,
    };
  });

  const allAges = escalated
    .map((item) => ({ item, days: daysInEscalation(item, now) }))
    .filter((entry): entry is { item: OperationalCase; days: number } => entry.days !== null)
    .sort((a, b) => b.days - a.days);

  const oldestEntry = allAges[0];

  return {
    bands,
    totalEscalatedOpen: escalated.length,
    totalEscalatedExposure: escalated.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    escalationRatePct: open.length === 0 ? 0 : (escalated.length / open.length) * 100,
    oldest: oldestEntry
      ? {
          caseNo: oldestEntry.item.caseNo,
          days: oldestEntry.days,
          exposure: oldestEntry.item.revenueAtRisk,
        }
      : null,
    unownedEscalated: escalated.filter((item) => item.ownerId === null).length,
    meanDays:
      allAges.length === 0
        ? null
        : Math.round(
            (allAges.reduce((sum, entry) => sum + entry.days, 0) / allAges.length) * 10,
          ) / 10,
  };
}

/* -------------------------------------------------------------- Ageing ---- */

export interface AgeBand {
  key: string;
  label: string;
  openCases: number;
  exposure: number;
}

const AGE_BANDS: { key: string; label: string; maxDays: number }[] = [
  { key: "0-3", label: "Under 3 days", maxDays: 3 },
  { key: "3-7", label: "3 to 7 days", maxDays: 7 },
  { key: "7-14", label: "1 to 2 weeks", maxDays: 14 },
  { key: "14+", label: "Over 2 weeks", maxDays: Number.POSITIVE_INFINITY },
];

/**
 * Open work by how long it has been open — *days in trouble*, banded.
 *
 * Distinct from SLA breach, and the distinction is the point: a low-band case
 * can be three weeks old and still inside its 720-hour target, while a critical
 * one breaches in a day. Age tells you what is being avoided; breach tells you
 * what is late. A portfolio can be clean on one and rotten on the other.
 */
export function ageProfile(cases: OperationalCase[], now: Date): AgeBand[] {
  const open = cases.filter((item) => isOpenStatus(item.status));

  return AGE_BANDS.map((band, index) => {
    const lower = index === 0 ? 0 : (AGE_BANDS[index - 1]?.maxDays ?? 0);
    const items = open.filter((item) => {
      const days = (now.getTime() - new Date(item.openedAt).getTime()) / HOUR_MS / 24;
      return days >= lower && days < band.maxDays;
    });

    return {
      key: band.key,
      label: band.label,
      openCases: items.length,
      exposure: items.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    };
  });
}

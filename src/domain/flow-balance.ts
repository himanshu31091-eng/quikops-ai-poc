import { isOpenStatus } from "./case-status";
import { hasBreachedSla, resolvedAtOf } from "./portfolio-metrics";
import type { OperationalCase, PriorityBand } from "./types";

/**
 * Flow balance — the portfolio as a system with an inlet and an outlet.
 *
 * Every other measure in the product describes the *stock* of open work: how
 * many, worth how much, how old. None of them answer the question an operations
 * director actually opens the week with — **is this getting better or worse, and
 * when does it clear?** That needs the *flow*: what arrived, what left, and the
 * balance between them over time.
 *
 * Two properties this module holds to:
 *
 * 1. **Nothing is stored.** Every figure is derived from the case corpus, so a
 *    case verified in this session moves the ledger, the burn-down and the
 *    forecast together. There is no seeded flow series that could drift from the
 *    cases it claims to describe — the defect class of D-48.
 *
 * 2. **The forecast is a run rate, not a model.** It extrapolates the trailing
 *    net rate and says so, carrying the number of periods it was computed from
 *    and the volatility of those periods. A projection that hides its basis is
 *    a guess wearing a suit, and an executive who is asked to act on one will
 *    ask where it came from.
 *
 * Framework-free by the `src/domain` rule: no React, no Next, no dates beyond
 * the `now` every caller passes in.
 */

const DAY_MS = 86_400_000;

/* --------------------------------------------------------------- Contracts */

/** Count of cases, or the revenue exposure they carry. */
export type FlowUnit = "count" | "value";

/** The windows a director asks for, and the bucket each one is read in. */
export type FlowHorizon = "week" | "month" | "quarter";

export interface FlowHorizonMeta {
  key: FlowHorizon;
  label: string;
  /** Length of the whole window. */
  days: number;
  /** Length of one bucket inside it. */
  bucketDays: number;
  /** How a single bucket is described in prose. */
  bucketNoun: string;
}

export const FLOW_HORIZONS: FlowHorizonMeta[] = [
  { key: "week", label: "This week", days: 7, bucketDays: 1, bucketNoun: "day" },
  { key: "month", label: "4 weeks", days: 28, bucketDays: 7, bucketNoun: "week" },
  { key: "quarter", label: "13 weeks", days: 91, bucketDays: 7, bucketNoun: "week" },
];

export function flowHorizon(key: FlowHorizon): FlowHorizonMeta {
  return FLOW_HORIZONS.find((entry) => entry.key === key) ?? FLOW_HORIZONS[1]!;
}

export interface FlowBucket {
  key: string;
  /** Short axis label — `04 Aug`. */
  label: string;
  startsAt: string;
  endsAt: string;
  /** Cases detected inside this bucket. */
  detected: number;
  /** Cases resolved inside it — verified or closed. */
  resolved: number;
  detectedValue: number;
  resolvedValue: number;
  /** Detected minus resolved. Negative means the backlog fell. */
  net: number;
  netValue: number;
  /** Open cases at the end of the bucket, reconstructed from the corpus. */
  openAtEnd: number;
  openValueAtEnd: number;
}

export interface FlowLedger {
  horizon: FlowHorizonMeta;
  /** Open at the moment the window began. */
  opening: number;
  detected: number;
  resolved: number;
  /** Open now. `opening + detected - resolved`, and it reconciles. */
  closing: number;
  net: number;
  /** Net movement as a share of the opening balance. */
  netPct: number;
  openingValue: number;
  detectedValue: number;
  resolvedValue: number;
  closingValue: number;
  netValue: number;
  netValuePct: number;
  buckets: FlowBucket[];
  /**
   * True when the window opens before the earliest case in the corpus, so the
   * opening balance is zero because there was nothing yet — not because the
   * portfolio was clear. Surfaced rather than hidden: a ledger that silently
   * starts from nothing makes "growing" trivially true.
   */
  precedesCorpus: boolean;
}

export type FlowDirection = "clearing" | "growing" | "holding";

export interface FlowForecast {
  direction: FlowDirection;
  /** Mean net movement per bucket across the window. Negative is clearing. */
  netPerBucket: number;
  netValuePerBucket: number;
  /** How many buckets the rate was computed from. Stated, never hidden. */
  basisBuckets: number;
  /** Spread of the per-bucket net, as a share of its own mean. */
  volatilityPct: number;
  /** Buckets until the open backlog reaches zero. Null unless clearing. */
  bucketsToClear: number | null;
  /** The same, expressed against the calendar. Null unless clearing. */
  clearsOn: string | null;
  /** Projected open balance, one point per bucket, continuing the run rate. */
  projection: { key: string; label: string; open: number; openValue: number }[];
}

export interface FlowComparison {
  /** Detected in the current window against the one immediately before it. */
  detected: number;
  detectedPrior: number;
  detectedDeltaPct: number;
  resolved: number;
  resolvedPrior: number;
  resolvedDeltaPct: number;
  netPrior: number;
  /** Positive means the portfolio cleared faster than it did last window. */
  netImprovement: number;
}

export interface FlowSlice {
  key: string;
  label: string;
  detected: number;
  resolved: number;
  net: number;
  detectedValue: number;
  resolvedValue: number;
  netValue: number;
  open: number;
  openValue: number;
}

/* ----------------------------------------------------------------- Helpers */

const startOfDay = (time: number): number => Math.floor(time / DAY_MS) * DAY_MS;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function bucketLabel(startMs: number, bucketDays: number): string {
  const date = new Date(startMs);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()] ?? "";
  return bucketDays === 1 ? `${day} ${month}` : `w/c ${day} ${month}`;
}

/** Detection is the moment the case opened; there is no earlier event to use. */
function detectedAtMs(item: OperationalCase): number {
  return new Date(item.openedAt).getTime();
}

/**
 * When a case left the open pool, or null if it has not.
 *
 * **Status decides whether, the timestamp decides when.** Those are two
 * questions and the corpus can answer them inconsistently: a low-band case
 * verified today carries a generated `verifiedAt` up to thirty days out, which
 * a timestamp-only rule reads as still open. Two cases in the seeded corpus do
 * exactly that, and taking the timestamp as the authority made this module
 * report 21 open against the 19 every other screen quotes.
 *
 * So `isOpenStatus` is the authority on membership — the same predicate
 * `portfolio-metrics` uses — and the timestamp is clamped to `now` purely to
 * place the resolution in a bucket. The invariant this buys is exact:
 * `closing === portfolioCounts.openCases`.
 */
function resolutionMoment(item: OperationalCase, nowMs: number): number | null {
  if (isOpenStatus(item.status)) return null;
  const at = resolvedAtOf(item);
  const raw = at === null ? detectedAtMs(item) : new Date(at).getTime();
  return Math.min(raw, nowMs);
}

/** Was this case open at `atMs`? Detected by then, and not resolved by then. */
function wasOpenAt(item: OperationalCase, atMs: number, nowMs: number): boolean {
  if (detectedAtMs(item) > atMs) return false;
  const resolved = resolutionMoment(item, nowMs);
  return resolved === null || resolved > atMs;
}

function sumValue(items: OperationalCase[]): number {
  return items.reduce((total, item) => total + item.revenueAtRisk, 0);
}

function pctChange(from: number, to: number): number {
  if (from === 0) return to === 0 ? 0 : 100;
  return ((to - from) / from) * 100;
}

/* ------------------------------------------------------------- The ledger */

/**
 * Detected, resolved and the balance between them, bucketed across the window.
 *
 * The opening balance is reconstructed rather than stored: it is the set of
 * cases that had been detected by the window's start and had not been resolved
 * by it. That is what makes `opening + detected − resolved = closing` hold
 * exactly, which is the property that lets the strip be read as a sentence.
 */
export function buildFlowLedger(
  cases: OperationalCase[],
  now: Date,
  horizonKey: FlowHorizon,
): FlowLedger {
  const horizon = flowHorizon(horizonKey);
  const nowMs = now.getTime();
  const windowStart = startOfDay(nowMs - horizon.days * DAY_MS);
  const bucketMs = horizon.bucketDays * DAY_MS;
  const bucketCount = Math.max(1, Math.round(horizon.days / horizon.bucketDays));

  const openingCases = cases.filter((item) => wasOpenAt(item, windowStart, nowMs));
  const detectedCases = cases.filter((item) => detectedAtMs(item) > windowStart);
  const resolvedCases = cases.filter((item) => {
    const at = resolutionMoment(item, nowMs);
    return at !== null && at > windowStart && at <= nowMs;
  });
  const closingCases = cases.filter((item) => wasOpenAt(item, nowMs, nowMs));

  const buckets: FlowBucket[] = [];
  for (let index = 0; index < bucketCount; index += 1) {
    const startsAt = windowStart + index * bucketMs;
    const endsAt = Math.min(startsAt + bucketMs, nowMs);

    const inBucket = (at: number | null): boolean =>
      at !== null && at > startsAt && at <= endsAt;

    const detected = cases.filter((item) => inBucket(detectedAtMs(item)));
    const resolved = cases.filter((item) => inBucket(resolutionMoment(item, nowMs)));
    const openAtEnd = cases.filter((item) => wasOpenAt(item, endsAt, nowMs));

    buckets.push({
      key: `b${index}`,
      label: bucketLabel(startsAt, horizon.bucketDays),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      detected: detected.length,
      resolved: resolved.length,
      detectedValue: sumValue(detected),
      resolvedValue: sumValue(resolved),
      net: detected.length - resolved.length,
      netValue: sumValue(detected) - sumValue(resolved),
      openAtEnd: openAtEnd.length,
      openValueAtEnd: sumValue(openAtEnd),
    });
  }

  const opening = openingCases.length;
  const detected = detectedCases.length;
  const resolved = resolvedCases.length;
  const openingValue = sumValue(openingCases);
  const detectedValue = sumValue(detectedCases);
  const resolvedValue = sumValue(resolvedCases);

  return {
    horizon,
    opening,
    detected,
    resolved,
    closing: closingCases.length,
    net: detected - resolved,
    netPct: pctChange(opening, closingCases.length),
    openingValue,
    detectedValue,
    resolvedValue,
    closingValue: sumValue(closingCases),
    netValue: detectedValue - resolvedValue,
    netValuePct: pctChange(openingValue, sumValue(closingCases)),
    buckets,
    precedesCorpus:
      cases.length > 0 &&
      cases.every((item) => detectedAtMs(item) > windowStart),
  };
}

/* ------------------------------------------------------------- The forecast */

/**
 * Where the backlog goes if the trailing rate holds.
 *
 * Deliberately the simplest defensible extrapolation: the mean net movement per
 * bucket, applied forward. It carries `basisBuckets` and `volatilityPct` so a
 * reader can judge it — a clear date computed from three noisy weeks deserves
 * less weight than one computed from thirteen steady ones, and the projection
 * should not pretend otherwise.
 *
 * `direction` is banded rather than taken from the sign alone: a net of ±2% of
 * the open balance per bucket is noise, not a trend, and calling it one is how
 * a dashboard loses an executive's trust.
 */
export function forecastFlow(ledger: FlowLedger, now: Date): FlowForecast {
  const buckets = ledger.buckets;
  const basisBuckets = buckets.length;

  const netPerBucket =
    basisBuckets === 0
      ? 0
      : buckets.reduce((sum, bucket) => sum + bucket.net, 0) / basisBuckets;
  const netValuePerBucket =
    basisBuckets === 0
      ? 0
      : buckets.reduce((sum, bucket) => sum + bucket.netValue, 0) / basisBuckets;

  const mean = netPerBucket;
  const variance =
    basisBuckets === 0
      ? 0
      : buckets.reduce((sum, bucket) => sum + (bucket.net - mean) ** 2, 0) / basisBuckets;
  const deviation = Math.sqrt(variance);
  const volatilityPct =
    Math.abs(mean) < 0.01 ? 100 : Math.min(999, (deviation / Math.abs(mean)) * 100);

  // Noise band: movement smaller than 2% of the open balance per bucket is not
  // a direction, whichever way it points.
  const noiseBand = Math.max(0.5, ledger.closing * 0.02);
  const direction: FlowDirection =
    netPerBucket < -noiseBand ? "clearing" : netPerBucket > noiseBand ? "growing" : "holding";

  const bucketsToClear =
    direction === "clearing" && netPerBucket < 0
      ? Math.ceil(ledger.closing / -netPerBucket)
      : null;

  const bucketMs = ledger.horizon.bucketDays * DAY_MS;
  const clearsOn =
    bucketsToClear === null
      ? null
      : new Date(now.getTime() + bucketsToClear * bucketMs).toISOString();

  // Project far enough to show the trajectory, and no further: six buckets, or
  // the point of clearance if that comes first.
  const projectionLength = Math.min(6, bucketsToClear ?? 6);
  const projection: FlowForecast["projection"] = [];
  let open = ledger.closing;
  let openValue = ledger.closingValue;
  for (let index = 1; index <= projectionLength; index += 1) {
    open = Math.max(0, open + netPerBucket);
    openValue = Math.max(0, openValue + netValuePerBucket);
    const startsAt = now.getTime() + index * bucketMs;
    projection.push({
      key: `p${index}`,
      label: bucketLabel(startsAt, ledger.horizon.bucketDays),
      open: Math.round(open),
      openValue: Math.round(openValue),
    });
  }

  return {
    direction,
    netPerBucket,
    netValuePerBucket,
    basisBuckets,
    volatilityPct,
    bucketsToClear,
    clearsOn,
    projection,
  };
}

/* ----------------------------------------------------------- Comparisons */

/** The current window against the one immediately before it, same length. */
export function compareFlowWindows(
  cases: OperationalCase[],
  now: Date,
  horizonKey: FlowHorizon,
): FlowComparison {
  const horizon = flowHorizon(horizonKey);
  const nowMs = now.getTime();
  const windowMs = horizon.days * DAY_MS;
  const currentStart = nowMs - windowMs;
  const priorStart = currentStart - windowMs;

  const inWindow = (at: number | null, from: number, to: number): boolean =>
    at !== null && at > from && at <= to;

  const detected = cases.filter((item) =>
    inWindow(detectedAtMs(item), currentStart, nowMs),
  ).length;
  const detectedPrior = cases.filter((item) =>
    inWindow(detectedAtMs(item), priorStart, currentStart),
  ).length;
  const resolved = cases.filter((item) =>
    inWindow(resolutionMoment(item, nowMs), currentStart, nowMs),
  ).length;
  const resolvedPrior = cases.filter((item) =>
    inWindow(resolutionMoment(item, nowMs), priorStart, currentStart),
  ).length;

  const net = detected - resolved;
  const netPrior = detectedPrior - resolvedPrior;

  return {
    detected,
    detectedPrior,
    detectedDeltaPct: pctChange(detectedPrior, detected),
    resolved,
    resolvedPrior,
    resolvedDeltaPct: pctChange(resolvedPrior, resolved),
    netPrior,
    netImprovement: netPrior - net,
  };
}

/* ------------------------------------------------------------- Drill-down */

export type FlowDimension = "plant" | "band" | "exception" | "owner";

/**
 * The same flow arithmetic, cut by one dimension.
 *
 * Every slice uses the identical detected/resolved definitions as the headline
 * ledger, so a drill-down can be summed back to it. A breakdown that does not
 * reconcile with the number above it is worse than no breakdown.
 */
export function flowByDimension(
  cases: OperationalCase[],
  now: Date,
  horizonKey: FlowHorizon,
  dimension: FlowDimension,
  labelFor: (key: string) => string,
): FlowSlice[] {
  const horizon = flowHorizon(horizonKey);
  const nowMs = now.getTime();
  const windowStart = startOfDay(nowMs - horizon.days * DAY_MS);

  const keyOf = (item: OperationalCase): string => {
    if (dimension === "plant") return item.plantCode;
    if (dimension === "band") return item.priorityBand;
    if (dimension === "exception") return item.exceptionType;
    return item.ownerId ?? "unassigned";
  };

  const grouped = new Map<string, OperationalCase[]>();
  for (const item of cases) {
    const key = keyOf(item);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(item);
    else grouped.set(key, [item]);
  }

  const slices: FlowSlice[] = [];
  for (const [key, items] of grouped) {
    const detected = items.filter((item) => detectedAtMs(item) > windowStart);
    const resolved = items.filter((item) => {
      const at = resolutionMoment(item, nowMs);
      return at !== null && at > windowStart && at <= nowMs;
    });
    const open = items.filter((item) => wasOpenAt(item, nowMs, nowMs));

    slices.push({
      key,
      label: labelFor(key),
      detected: detected.length,
      resolved: resolved.length,
      net: detected.length - resolved.length,
      detectedValue: sumValue(detected),
      resolvedValue: sumValue(resolved),
      netValue: sumValue(detected) - sumValue(resolved),
      open: open.length,
      openValue: sumValue(open),
    });
  }

  // Worst first: the slice adding most to the backlog is the one to act on.
  return slices.sort((a, b) => b.net - a.net || b.openValue - a.openValue);
}

/* ---------------------------------------------------- Executive narrative */

export type NarrativeTone = "critical" | "high" | "success" | "info";

export interface NarrativeDriver {
  label: string;
  detail: string;
}

export interface ExecutiveNarrative {
  headline: string;
  body: string;
  tone: NarrativeTone;
  drivers: NarrativeDriver[];
  /** Where every figure in the narrative came from. */
  basis: string;
}

/**
 * How a monetary figure is rendered inside a narrative sentence.
 *
 * Passed in rather than imported: `src/domain` imports nothing above itself, and
 * money formatting has exactly one definition (`src/lib/format`). Taking the
 * formatter as a parameter keeps both rules intact and keeps these sentences
 * reading in the same currency notation as every other figure on the screen.
 */
export type MoneyFormatter = (amount: number) => string;

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * The position, in three sentences, composed from the ledger.
 *
 * Rule-composed rather than model-written, and the UI says so: every number in
 * it is one of the figures on the screen beside it, so the narrative cannot
 * drift from the charts. The live Copilot is the path for questions this cannot
 * anticipate — this is the standing answer to the one question every executive
 * opens with.
 */
export function buildExecutiveNarrative(
  ledger: FlowLedger,
  forecast: FlowForecast,
  comparison: FlowComparison,
  worstSlice: FlowSlice | null,
  formatValue: MoneyFormatter,
): ExecutiveNarrative {
  const noun = ledger.horizon.bucketNoun;
  const rate = Math.abs(forecast.netPerBucket);

  const drivers: NarrativeDriver[] = [];

  if (worstSlice && worstSlice.net > 0) {
    drivers.push({
      label: worstSlice.label,
      detail: `Added ${plural(worstSlice.net, "case", "cases")} net over the window and now holds ${formatValue(worstSlice.openValue)}.`,
    });
  }

  if (comparison.netImprovement !== 0) {
    const better = comparison.netImprovement > 0;
    drivers.push({
      label: better ? "Improving on last period" : "Worse than last period",
      detail: `Net movement is ${Math.abs(comparison.netImprovement)} ${
        better ? "better" : "worse"
      } than the previous ${ledger.horizon.days} days (${comparison.netPrior >= 0 ? "+" : ""}${comparison.netPrior} then, ${ledger.net >= 0 ? "+" : ""}${ledger.net} now).`,
    });
  }

  if (comparison.resolvedDeltaPct !== 0) {
    drivers.push({
      label: "Resolution rate",
      detail: `${plural(comparison.resolved, "case", "cases")} resolved against ${comparison.resolvedPrior} last period — ${
        comparison.resolvedDeltaPct >= 0 ? "up" : "down"
      } ${Math.abs(Math.round(comparison.resolvedDeltaPct))}%.`,
    });
  }

  const basis = `Computed from ${plural(forecast.basisBuckets, noun, `${noun}s`)} of case data. Projection extrapolates the mean net rate; it is a run rate, not a model.`;

  if (forecast.direction === "clearing") {
    const clears =
      forecast.bucketsToClear === null
        ? ""
        : ` At this rate the open backlog clears in about ${plural(forecast.bucketsToClear, noun, `${noun}s`)}.`;
    return {
      headline: `The portfolio is clearing — ${rate.toFixed(1)} cases per ${noun} net.`,
      body: `${plural(ledger.detected, "case was", "cases were")} detected and ${plural(ledger.resolved, "was", "were")} resolved over the last ${ledger.horizon.days} days, taking the open balance from ${ledger.opening} to ${ledger.closing} and exposure from ${formatValue(ledger.openingValue)} to ${formatValue(ledger.closingValue)}.${clears}`,
      tone: "success",
      drivers,
      basis,
    };
  }

  if (forecast.direction === "growing") {
    return {
      headline: `The backlog is growing — ${rate.toFixed(1)} cases per ${noun} net.`,
      body: `${plural(ledger.detected, "case", "cases")} detected against ${plural(ledger.resolved, "resolution", "resolutions")} over the last ${ledger.horizon.days} days. Open exposure has moved from ${formatValue(ledger.openingValue)} to ${formatValue(ledger.closingValue)}. Detection is outpacing execution, so adding capacity to the queue will not close the gap on its own.`,
      tone: ledger.netPct > 15 ? "critical" : "high",
      drivers,
      basis,
    };
  }

  return {
    headline: "The portfolio is holding — detection and resolution are matched.",
    body: `${plural(ledger.detected, "case", "cases")} detected and ${plural(ledger.resolved, "resolved", "resolved")} over the last ${ledger.horizon.days} days, leaving the open balance effectively flat at ${ledger.closing} and exposure at ${formatValue(ledger.closingValue)}. A steady balance is not the same as a healthy one — the mix below is what decides that.`,
    tone: "info",
    drivers,
    basis,
  };
}

/* -------------------------------------------------- Executive recommendations */

export interface FlowRecommendation {
  id: string;
  title: string;
  rationale: string;
  /** The figure that makes the case for acting. */
  impact: string;
  tone: NarrativeTone;
  /** Deep link into the queue already scoped to what the card describes. */
  href: string;
  /** Cases the recommendation is derived from, for the impact figure. */
  caseCount: number;
}

/**
 * What to do about the position, ranked by the exposure behind it.
 *
 * Each card is derived from a condition that is true of the corpus right now,
 * and carries the figure that justifies it. Nothing is suggested that the data
 * does not already support — a recommendation an executive can disprove in one
 * click is worse than silence.
 */
export function buildFlowRecommendations(
  cases: OperationalCase[],
  ledger: FlowLedger,
  forecast: FlowForecast,
  worstSlice: FlowSlice | null,
  now: Date,
  formatValue: MoneyFormatter,
): FlowRecommendation[] {
  const open = cases.filter((item) => isOpenStatus(item.status));
  const recommendations: FlowRecommendation[] = [];

  const breached = open.filter((item) => hasBreachedSla(item, now));
  if (breached.length > 0) {
    recommendations.push({
      id: "clear-breaches",
      title: `Clear ${plural(breached.length, "case", "cases")} already past target`,
      rationale:
        "These are the only cases whose exposure is certain to age further before it is resolved. Every other lever moves a probability; this one moves a fact.",
      impact: `${formatValue(sumValue(breached))} held past SLA`,
      tone: "critical",
      href: "/work?overdue=true",
      caseCount: breached.length,
    });
  }

  const unassigned = open.filter((item) => item.ownerId === null);
  if (unassigned.length > 0) {
    recommendations.push({
      id: "assign-unowned",
      title: `Assign ${plural(unassigned.length, "unowned case", "unowned cases")}`,
      rationale:
        "An unowned case cannot move. Routing rules already name a default owner for every plant and exception type, so this is a confirmation rather than a decision.",
      impact: `${formatValue(sumValue(unassigned))} with no owner`,
      tone: "high",
      href: "/work?owner=unassigned",
      caseCount: unassigned.length,
    });
  }

  const awaitingVerification = open.filter((item) => item.status === "PENDING_VERIFY");
  if (awaitingVerification.length > 0) {
    recommendations.push({
      id: "clear-verification",
      title: `Review ${plural(awaitingVerification.length, "case", "cases")} awaiting verification`,
      rationale:
        "Exposure is only recovered on verification, never on closure. Work already finished is sitting in the at-risk pool until someone signs it off.",
      impact: `${formatValue(sumValue(awaitingVerification))} recoverable on sign-off`,
      tone: "success",
      href: "/my-work",
      caseCount: awaitingVerification.length,
    });
  }

  const recurring = open.filter((item) => item.recurrenceCount > 1);
  if (recurring.length > 0) {
    recommendations.push({
      id: "break-recurrence",
      title: `Break the recurrence behind ${plural(recurring.length, "case", "cases")}`,
      rationale:
        "Each of these has been detected before, which means the previous corrective action did not hold. Resolving them again buys one cycle; changing the playbook stops the inflow.",
      impact: `${formatValue(sumValue(recurring))} in repeat detections`,
      tone: "high",
      href: "/playbooks",
      caseCount: recurring.length,
    });
  }

  if (forecast.direction === "growing" && worstSlice && worstSlice.net > 0) {
    recommendations.push({
      id: "stem-inflow",
      title: `Stem detection at ${worstSlice.label}`,
      rationale:
        "The backlog is growing, and this is the single largest contributor to the net. Adding execution capacity elsewhere will not change the trajectory while this keeps arriving.",
      impact: `+${worstSlice.net} net over the last ${ledger.horizon.days} days`,
      tone: "critical",
      href: "/analytics",
      caseCount: worstSlice.open,
    });
  }

  const criticalOpen = open.filter((item) => item.priorityBand === "CRITICAL");
  if (recommendations.length < 3 && criticalOpen.length > 0) {
    recommendations.push({
      id: "critical-band",
      title: `Work the ${plural(criticalOpen.length, "critical case", "critical cases")} first`,
      rationale:
        "The priority score is rule-based and defensible in a review, so the top band is the agreed order of work rather than an opinion about it.",
      impact: `${formatValue(sumValue(criticalOpen))} in the critical band`,
      tone: "high",
      href: "/work?band=CRITICAL",
      caseCount: criticalOpen.length,
    });
  }

  return recommendations;
}

/* ------------------------------------------------------------ Band mixture */

export interface BandFlow {
  band: PriorityBand;
  detected: number;
  resolved: number;
  open: number;
  openValue: number;
}

/**
 * Flow split by priority band.
 *
 * A flat balance can hide a portfolio that is quietly trading low-band
 * resolutions for critical-band detections, which is a deterioration wearing
 * the appearance of stability. This is the panel that exposes that.
 */
export function bandFlow(
  cases: OperationalCase[],
  now: Date,
  horizonKey: FlowHorizon,
): BandFlow[] {
  const horizon = flowHorizon(horizonKey);
  const nowMs = now.getTime();
  const windowStart = startOfDay(nowMs - horizon.days * DAY_MS);
  const bands: PriorityBand[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return bands.map((band) => {
    const items = cases.filter((item) => item.priorityBand === band);
    const open = items.filter((item) => wasOpenAt(item, nowMs, nowMs));
    return {
      band,
      detected: items.filter((item) => detectedAtMs(item) > windowStart).length,
      resolved: items.filter((item) => {
        const at = resolutionMoment(item, nowMs);
        return at !== null && at > windowStart && at <= nowMs;
      }).length,
      open: open.length,
      openValue: sumValue(open),
    };
  });
}

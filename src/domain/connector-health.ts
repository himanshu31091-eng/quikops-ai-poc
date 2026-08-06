import type { ConnectorStatus } from "./types";

/**
 * Connector health scoring.
 *
 * Deterministic and rule-based, like every other score in the product
 * (`./priority`, `./case-health`): an integration dashboard exists to be
 * defended in an incident review, and "the connector looks unhealthy" is not an
 * answer anyone can act on.
 *
 * Three independent things can be wrong with a feed, and they need different
 * responses, so each is scored separately and the worst one sets the band:
 *
 *   - **Reliability** — are its runs succeeding?
 *   - **Freshness** — has it run when it said it would?
 *   - **Backlog** — how much has it failed to deliver and not retried?
 *
 * A connector that has not run for six hours is not "80% healthy" because its
 * last five runs passed. Staleness is a different failure and is banded on its
 * own axis.
 */

const MINUTE_MS = 60_000;

export const CONNECTOR_HEALTH_BANDS = ["HEALTHY", "DEGRADED", "FAILING", "STALE"] as const;
export type ConnectorHealthBand = (typeof CONNECTOR_HEALTH_BANDS)[number];

export const CONNECTOR_HEALTH_META: Record<
  ConnectorHealthBand,
  { label: string; className: string; dotClassName: string; icon: string }
> = {
  HEALTHY: {
    label: "Healthy",
    className: "bg-success-subtle text-success-content border-success-line",
    dotClassName: "bg-success",
    icon: "CircleCheck",
  },
  DEGRADED: {
    label: "Degraded",
    className: "bg-high-subtle text-high-content border-high-line",
    dotClassName: "bg-high",
    icon: "TriangleAlert",
  },
  FAILING: {
    label: "Failing",
    className: "bg-critical-subtle text-critical-content border-critical-line",
    dotClassName: "bg-critical",
    icon: "OctagonAlert",
  },
  STALE: {
    label: "Stale",
    className: "bg-medium-subtle text-medium-content border-medium-line",
    dotClassName: "bg-medium",
    icon: "Clock",
  },
};

export const CONNECTOR_STATUS_META: Record<
  ConnectorStatus,
  { label: string; className: string; dotClassName: string; icon: string }
> = {
  SUCCESS: {
    label: "Success",
    className: "bg-success-subtle text-success-content border-success-line",
    dotClassName: "bg-success",
    icon: "Check",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-high-subtle text-high-content border-high-line",
    dotClassName: "bg-high",
    icon: "TriangleAlert",
  },
  FAILED: {
    label: "Failed",
    className: "bg-critical-subtle text-critical-content border-critical-line",
    dotClassName: "bg-critical",
    icon: "X",
  },
  RUNNING: {
    label: "Running",
    className: "bg-accent-subtle text-accent-content border-accent-line",
    dotClassName: "bg-accent",
    icon: "RefreshCw",
  },
};

/* --------------------------------------------------------------- Weights */

export const CONNECTOR_HEALTH_WEIGHTS = {
  /** A failed run is worth more than a partial one; both are worth reporting. */
  failedRun: 22,
  partialRun: 8,
  /** Rejected rows inside an otherwise successful run. */
  rejectionRate: 18,
  /** Undelivered messages nobody has replayed. */
  deadLetter: 20,
} as const;

/** How late a feed may be, as a multiple of its own cadence, before it is stale. */
const STALE_CADENCE_MULTIPLE = 2.5;
const DEGRADED_CADENCE_MULTIPLE = 1.5;

/** Runs considered when scoring reliability. Older history is context, not signal. */
export const HEALTH_WINDOW_RUNS = 12;

export interface ConnectorRunSummary {
  status: ConnectorStatus;
  recordsProcessed: number;
  recordsFailed: number;
}

export interface ConnectorHealthInput {
  /** Newest first. Only the first `HEALTH_WINDOW_RUNS` are scored. */
  runs: ConnectorRunSummary[];
  deadLetterDepth: number;
  lastRunAt: string;
  /** Expected interval between runs, in minutes. */
  cadenceMinutes: number;
  /** A paused connector is not unhealthy — it is switched off on purpose. */
  isEnabled: boolean;
}

export interface ConnectorHealth {
  /** 0–100. */
  score: number;
  band: ConnectorHealthBand;
  /** Minutes since the last run finished. */
  minutesSinceLastRun: number;
  /** True once the feed has missed its cadence badly enough to matter. */
  isStale: boolean;
  successRatePct: number;
  rejectionRatePct: number;
  drivers: { label: string; detail: string; positive: boolean }[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function scoreConnectorHealth(
  input: ConnectorHealthInput,
  now: Date,
): ConnectorHealth {
  const window = input.runs.slice(0, HEALTH_WINDOW_RUNS);
  const drivers: ConnectorHealth["drivers"] = [];

  const minutesSinceLastRun = Math.max(
    0,
    Math.round((now.getTime() - new Date(input.lastRunAt).getTime()) / MINUTE_MS),
  );
  const cadenceRatio =
    input.cadenceMinutes > 0 ? minutesSinceLastRun / input.cadenceMinutes : 0;
  const isStale = input.isEnabled && cadenceRatio >= STALE_CADENCE_MULTIPLE;

  // A disabled connector reports as paused rather than failing. Scoring it
  // against a cadence it is not trying to meet would bury the real failures.
  if (!input.isEnabled) {
    return {
      score: 0,
      band: "STALE",
      minutesSinceLastRun,
      isStale: false,
      successRatePct: 0,
      rejectionRatePct: 0,
      drivers: [
        {
          label: "Paused",
          detail: "This connector is switched off. No ingestion is expected.",
          positive: false,
        },
      ],
    };
  }

  if (window.length === 0) {
    return {
      score: 0,
      band: "STALE",
      minutesSinceLastRun,
      isStale: true,
      successRatePct: 0,
      rejectionRatePct: 0,
      drivers: [
        {
          label: "No run history",
          detail: "This connector has never completed a run.",
          positive: false,
        },
      ],
    };
  }

  let score = 100;

  /* Reliability */
  const failed = window.filter((run) => run.status === "FAILED").length;
  const partial = window.filter((run) => run.status === "PARTIAL").length;
  const succeeded = window.filter((run) => run.status === "SUCCESS").length;
  const completed = window.filter((run) => run.status !== "RUNNING").length;
  const successRatePct = completed === 0 ? 0 : (succeeded / completed) * 100;

  if (failed > 0) {
    const penalty = Math.round(
      CONNECTOR_HEALTH_WEIGHTS.failedRun * clamp(failed / Math.max(completed, 1), 0, 1),
    );
    score -= penalty;
    drivers.push({
      label: `${failed} failed run${failed === 1 ? "" : "s"}`,
      detail: `${failed} of the last ${completed} runs did not complete.`,
      positive: false,
    });
  }

  if (partial > 0) {
    const penalty = Math.round(
      CONNECTOR_HEALTH_WEIGHTS.partialRun * clamp(partial / Math.max(completed, 1), 0, 1),
    );
    score -= penalty;
    drivers.push({
      label: `${partial} partial run${partial === 1 ? "" : "s"}`,
      detail: "Completed, but some rows were rejected.",
      positive: false,
    });
  }

  if (failed === 0 && partial === 0) {
    drivers.push({
      label: "Runs clean",
      detail: `All ${completed} runs in the window completed without rejection.`,
      positive: true,
    });
  }

  /* Rejection rate */
  const processed = window.reduce((sum, run) => sum + run.recordsProcessed, 0);
  const rejected = window.reduce((sum, run) => sum + run.recordsFailed, 0);
  const rejectionRatePct = processed === 0 ? 0 : (rejected / processed) * 100;

  if (rejectionRatePct > 0) {
    // Saturates at 5%: past that the feed is broken, not noisy, and the failed
    // runs above will already have taken the bigger penalty.
    const penalty = Math.round(
      CONNECTOR_HEALTH_WEIGHTS.rejectionRate * clamp(rejectionRatePct / 5, 0, 1),
    );
    score -= penalty;
    drivers.push({
      label: `${rejectionRatePct.toFixed(1)}% of rows rejected`,
      detail: `${rejected.toLocaleString("en-US")} of ${processed.toLocaleString("en-US")} rows failed validation.`,
      positive: false,
    });
  }

  /* Dead-letter backlog */
  if (input.deadLetterDepth > 0) {
    const penalty = Math.round(
      CONNECTOR_HEALTH_WEIGHTS.deadLetter * clamp(input.deadLetterDepth / 10, 0, 1),
    );
    score -= penalty;
    drivers.push({
      label: `${input.deadLetterDepth} message${input.deadLetterDepth === 1 ? "" : "s"} in the dead-letter queue`,
      detail: "Received but not delivered. Nothing downstream has seen these.",
      positive: false,
    });
  }

  /* Freshness */
  if (isStale) {
    drivers.push({
      label: "Overdue",
      detail: `Last ran ${minutesSinceLastRun} minutes ago against a ${input.cadenceMinutes}-minute cadence.`,
      positive: false,
    });
  } else if (cadenceRatio >= DEGRADED_CADENCE_MULTIPLE) {
    score -= 10;
    drivers.push({
      label: "Running late",
      detail: `${minutesSinceLastRun} minutes since the last run; expected every ${input.cadenceMinutes}.`,
      positive: false,
    });
  } else {
    drivers.push({
      label: "On cadence",
      detail: `Last ran ${minutesSinceLastRun} minutes ago.`,
      positive: true,
    });
  }

  const bounded = Math.round(clamp(score, 0, 100));

  // Staleness overrides the numeric band: a feed that has stopped is a
  // different problem from one that is delivering badly, and it needs a
  // different person to look at it.
  const band: ConnectorHealthBand = isStale
    ? "STALE"
    : bounded >= 80
      ? "HEALTHY"
      : bounded >= 55
        ? "DEGRADED"
        : "FAILING";

  return {
    score: bounded,
    band,
    minutesSinceLastRun,
    isStale,
    successRatePct: Math.round(successRatePct * 10) / 10,
    rejectionRatePct: Math.round(rejectionRatePct * 100) / 100,
    drivers,
  };
}

/** Minutes until the next scheduled run. Negative once overdue. */
export function minutesUntilNextRun(
  lastRunAt: string,
  cadenceMinutes: number,
  now: Date,
): number {
  const next = new Date(lastRunAt).getTime() + cadenceMinutes * MINUTE_MS;
  return Math.round((next - now.getTime()) / MINUTE_MS);
}

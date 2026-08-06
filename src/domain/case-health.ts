import type { CaseHealth, CaseStatus, CorrectiveAction, PriorityBand } from "./types";

/**
 * Execution health — is this case on track, as distinct from how important it
 * is. Priority says how much it matters; health says whether the work is
 * actually moving.
 *
 * Pure and dependency-free on purpose: the server scores it when the page is
 * rendered, and the client re-scores it the moment an action is completed or an
 * owner is assigned, so the dial moves as the manager works rather than sitting
 * at whatever it was when the page loaded.
 */

const HOUR_MS = 3_600_000;

/** Overrun in the unit that carries meaning at that magnitude. */
function formatOverrun(hours: number): string {
  if (hours < 24) {
    const rounded = Math.max(1, Math.round(hours));
    return `${rounded} hour${rounded === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export interface CaseHealthInput {
  status: CaseStatus;
  ownerId: string | null;
  dueAt: string;
  escalationLevel: number;
  recurrenceCount: number;
  priorityBand: PriorityBand;
  actions: Pick<CorrectiveAction, "status">[];
}

export function scoreCaseHealth(input: CaseHealthInput, now: Date): CaseHealth {
  const drivers: CaseHealth["drivers"] = [];
  let score = 100;

  const hoursRemaining = (new Date(input.dueAt).getTime() - now.getTime()) / HOUR_MS;
  const breached = hoursRemaining < 0;
  const terminal = input.status === "VERIFIED" || input.status === "CLOSED";

  if (terminal) {
    drivers.push({
      label: "Outcome recorded",
      detail: "Verified against the measurement window. The SLA clock is stopped.",
      positive: true,
    });
  } else if (breached) {
    score -= 35;
    drivers.push({
      label: "Past SLA",
      // Said in hours under a day: a case three hours past target rounded to
      // "0 days beyond the resolution target", which reads as no breach at all.
      detail: `${formatOverrun(Math.abs(hoursRemaining))} beyond the resolution target.`,
      positive: false,
    });
  } else if (hoursRemaining < 24) {
    score -= 15;
    drivers.push({
      label: "Due inside 24 hours",
      detail: `${Math.max(Math.round(hoursRemaining), 0)} hours of SLA remaining.`,
      positive: false,
    });
  } else {
    drivers.push({
      label: "Within SLA",
      detail: `${Math.round(hoursRemaining / 24)} days of resolution target remaining.`,
      positive: true,
    });
  }

  if (input.ownerId === null) {
    score -= 25;
    drivers.push({
      label: "No owner",
      detail: "Nobody is accountable for this case yet.",
      positive: false,
    });
  } else {
    drivers.push({
      label: "Owned",
      detail: "An accountable owner is named on the case.",
      positive: true,
    });
  }

  const done = input.actions.filter((action) => action.status === "DONE").length;
  const blocked = input.actions.filter((action) => action.status === "BLOCKED").length;

  if (input.actions.length === 0 && !terminal) {
    score -= 20;
    drivers.push({
      label: "No corrective plan",
      detail: "No actions have been created against this case.",
      positive: false,
    });
  } else if (input.actions.length > 0) {
    const pct = Math.round((done / input.actions.length) * 100);
    if (pct >= 100) {
      drivers.push({
        label: "Plan complete",
        detail: `All ${input.actions.length} corrective actions closed.`,
        positive: true,
      });
    } else {
      score -= Math.round((100 - pct) * 0.2);
      drivers.push({
        label: "Plan in flight",
        detail: `${done} of ${input.actions.length} actions complete (${pct}%).`,
        positive: pct >= 50,
      });
    }
  }

  if (blocked > 0) {
    score -= 10 * blocked;
    drivers.push({
      label: "Blocked work",
      detail: `${blocked} action${blocked === 1 ? "" : "s"} waiting on an external party.`,
      positive: false,
    });
  }

  if (input.escalationLevel > 0) {
    score -= 10 * input.escalationLevel;
    drivers.push({
      label: `Escalation level ${input.escalationLevel}`,
      detail: "Raised above the owner after the SLA threshold was reached.",
      positive: false,
    });
  }

  if (input.recurrenceCount > 2) {
    score -= 10;
    drivers.push({
      label: "Repeat condition",
      detail: `${input.recurrenceCount} detections against the same material and source.`,
      positive: false,
    });
  }

  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    band: bounded >= 75 ? "ON_TRACK" : bounded >= 45 ? "AT_RISK" : "OFF_TRACK",
    drivers,
  };
}

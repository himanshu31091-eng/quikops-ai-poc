import { SLA_TARGET_HOURS } from "@/src/domain/sla";
import type { CaseStatus, PriorityBand } from "@/src/domain/types";
import { formatHours } from "@/src/lib/format";

const HOUR_MS = 3_600_000;

export interface SlaState {
  hoursRemaining: number;
  breached: boolean;
  /** True inside the last quarter of the window, before the breach. */
  atRisk: boolean;
  /** 0–100 — how much of the SLA window has been consumed. */
  consumedPct: number;
  label: string;
  targetHours: number;
  /** Terminal cases stop the clock; the countdown becomes an outcome. */
  stopped: boolean;
}

const TERMINAL: CaseStatus[] = ["VERIFIED", "CLOSED", "DISMISSED"];

export function computeSla(
  dueAt: string,
  status: CaseStatus,
  priorityBand: PriorityBand,
  now: Date,
): SlaState {
  const targetHours = SLA_TARGET_HOURS[priorityBand];
  const hoursRemaining = (new Date(dueAt).getTime() - now.getTime()) / HOUR_MS;
  const stopped = TERMINAL.includes(status);
  const consumed = Math.min(
    100,
    Math.max(0, ((targetHours - hoursRemaining) / targetHours) * 100),
  );

  if (stopped) {
    return {
      hoursRemaining,
      breached: false,
      atRisk: false,
      consumedPct: 100,
      label: "SLA clock stopped",
      targetHours,
      stopped: true,
    };
  }

  const breached = hoursRemaining < 0;
  return {
    hoursRemaining,
    breached,
    atRisk: !breached && consumed >= 75,
    consumedPct: consumed,
    label: breached
      ? `${formatHours(Math.abs(hoursRemaining))} past SLA`
      : `${formatHours(hoursRemaining)} remaining`,
    targetHours,
    stopped: false,
  };
}

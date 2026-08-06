import type { PriorityBand } from "./types";

/**
 * Resolution SLA by priority band, per the approved sprint plan. Owned here so
 * the seeded cases, the Work Manager and any case created by hand all breach at
 * exactly the same moment.
 */
export const SLA_TARGET_HOURS: Record<PriorityBand, number> = {
  CRITICAL: 24,
  HIGH: 72,
  MEDIUM: 240,
  LOW: 720,
};

const HOUR_MS = 3_600_000;

export function dueAtFor(band: PriorityBand, openedAt: string | Date): string {
  const opened = typeof openedAt === "string" ? new Date(openedAt) : openedAt;
  return new Date(opened.getTime() + SLA_TARGET_HOURS[band] * HOUR_MS).toISOString();
}

import type { ActionItem, ActionStatus, PriorityBand } from "./types";

/**
 * Time pressure on a single corrective action.
 *
 * Distinct from case SLA (`./sla`), which measures the whole case against its
 * resolution target. An action has its own due date inside that window, and a
 * case can be comfortably within its target while the action blocking it is
 * three days late. The Action Center exists to surface exactly that gap.
 *
 * Pure and dependency-free: the server bands actions when the page renders, and
 * the client re-bands them the moment a due date or status changes.
 */

const HOUR_MS = 3_600_000;

export const ACTION_SLA_STATES = [
  "OVERDUE",
  "DUE_TODAY",
  "DUE_SOON",
  "ON_TRACK",
  "DONE",
] as const;
export type ActionSlaState = (typeof ACTION_SLA_STATES)[number];

/**
 * How far ahead counts as "due soon", by the priority of the case the action
 * belongs to. A critical action three days out is not urgent; a critical action
 * eight hours out is, because its case only has 24 hours in total.
 */
const DUE_SOON_HOURS: Record<PriorityBand, number> = {
  CRITICAL: 8,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

export const ACTION_SLA_META: Record<
  ActionSlaState,
  { label: string; shortLabel: string; className: string; dotClassName: string; icon: string }
> = {
  OVERDUE: {
    label: "Overdue",
    shortLabel: "Overdue",
    className: "bg-critical-subtle text-critical-content border-critical-line",
    dotClassName: "bg-critical",
    icon: "TriangleAlert",
  },
  DUE_TODAY: {
    label: "Due today",
    shortLabel: "Today",
    className: "bg-high-subtle text-high-content border-high-line",
    dotClassName: "bg-high",
    icon: "Clock",
  },
  DUE_SOON: {
    label: "Due soon",
    shortLabel: "Soon",
    className: "bg-medium-subtle text-medium-content border-medium-line",
    dotClassName: "bg-medium",
    icon: "Hourglass",
  },
  ON_TRACK: {
    label: "On track",
    shortLabel: "On track",
    className: "bg-surface-hover text-content-secondary border-line",
    dotClassName: "bg-content-tertiary",
    icon: "Check",
  },
  DONE: {
    label: "Complete",
    shortLabel: "Complete",
    className: "bg-success-subtle text-success-content border-success-line",
    dotClassName: "bg-success",
    icon: "CircleCheck",
  },
};

/** States that represent work still owed. */
export const OPEN_ACTION_STATUSES: ActionStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED"];

const OPEN_SET = new Set<ActionStatus>(OPEN_ACTION_STATUSES);

export function isOpenAction(status: ActionStatus): boolean {
  return OPEN_SET.has(status);
}

export interface ActionSlaInput {
  status: ActionStatus;
  dueAt: string;
  priorityBand: PriorityBand;
}

export function actionSlaState(input: ActionSlaInput, now: Date): ActionSlaState {
  if (!isOpenAction(input.status)) return "DONE";

  const hoursRemaining = (new Date(input.dueAt).getTime() - now.getTime()) / HOUR_MS;
  if (hoursRemaining < 0) return "OVERDUE";

  // "Today" is the calendar day the manager is working in, not a rolling 24
  // hours — an action due at 23:00 tonight and one due at 09:00 tomorrow are
  // different conversations even though they are nine hours apart.
  const due = new Date(input.dueAt);
  if (
    due.getUTCFullYear() === now.getUTCFullYear() &&
    due.getUTCMonth() === now.getUTCMonth() &&
    due.getUTCDate() === now.getUTCDate()
  ) {
    return "DUE_TODAY";
  }

  return hoursRemaining <= DUE_SOON_HOURS[input.priorityBand] ? "DUE_SOON" : "ON_TRACK";
}

/** Hours until due; negative once past. Null for actions that are finished. */
export function hoursUntilDue(action: Pick<ActionItem, "status" | "dueAt">, now: Date): number | null {
  if (!isOpenAction(action.status)) return null;
  return (new Date(action.dueAt).getTime() - now.getTime()) / HOUR_MS;
}

/**
 * Which deadline bucket an action falls into, for the upcoming-deadlines
 * timeline. Overdue is checked first: a task that is both overdue and due this
 * week belongs in the bucket that demands action.
 */
export const DEADLINE_BUCKETS = ["OVERDUE", "TODAY", "TOMORROW", "THIS_WEEK", "LATER"] as const;
export type DeadlineBucket = (typeof DEADLINE_BUCKETS)[number];

export const DEADLINE_BUCKET_META: Record<
  DeadlineBucket,
  { label: string; tone: "critical" | "high" | "medium" | "neutral" }
> = {
  OVERDUE: { label: "Overdue", tone: "critical" },
  TODAY: { label: "Today", tone: "high" },
  TOMORROW: { label: "Tomorrow", tone: "medium" },
  THIS_WEEK: { label: "This week", tone: "neutral" },
  LATER: { label: "Later", tone: "neutral" },
};

const DAY_MS = 86_400_000;

export function deadlineBucketOf(
  action: Pick<ActionItem, "status" | "dueAt">,
  now: Date,
): DeadlineBucket | null {
  if (!isOpenAction(action.status)) return null;

  const due = new Date(action.dueAt);
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  const dayOffset = Math.round((dueDay - startOfToday) / DAY_MS);

  if (due.getTime() < now.getTime()) return "OVERDUE";
  if (dayOffset === 0) return "TODAY";
  if (dayOffset === 1) return "TOMORROW";
  if (dayOffset <= 7) return "THIS_WEEK";
  return "LATER";
}

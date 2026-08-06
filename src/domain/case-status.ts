import type { CaseStatus } from "./types";

/**
 * Execution lifecycle, as managers talk about it.
 *
 * The persisted `CaseStatus` enum is finer-grained than the board a manager
 * works from: `NEW`, `TRIAGED` and `REOPENED` are all "detected but not yet
 * owned", and `DISMISSED` is a terminal outcome alongside `CLOSED`. This module
 * is the single mapping between the two, so the Work Manager board, the status
 * filter and any later module all agree on the collapse.
 */
export const CASE_STATUS_GROUPS = [
  "DETECTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_VERIFICATION",
  "VERIFIED",
  "CLOSED",
] as const;
export type CaseStatusGroup = (typeof CASE_STATUS_GROUPS)[number];

const GROUP_BY_STATUS: Record<CaseStatus, CaseStatusGroup> = {
  NEW: "DETECTED",
  TRIAGED: "DETECTED",
  REOPENED: "DETECTED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_VERIFY: "WAITING_VERIFICATION",
  VERIFIED: "VERIFIED",
  CLOSED: "CLOSED",
  DISMISSED: "CLOSED",
};

/**
 * The status written when a case is moved to a group by hand — dragged across
 * the board or actioned from a row menu. Moving a case back to Detected leaves
 * it `TRIAGED` rather than `NEW`: it has already been looked at once.
 */
const PRIMARY_STATUS_BY_GROUP: Record<CaseStatusGroup, CaseStatus> = {
  DETECTED: "TRIAGED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_VERIFICATION: "PENDING_VERIFY",
  VERIFIED: "VERIFIED",
  CLOSED: "CLOSED",
};

export const STATUS_GROUP_META: Record<
  CaseStatusGroup,
  { label: string; shortLabel: string; dotClassName: string; icon: string }
> = {
  DETECTED: {
    label: "Detected",
    shortLabel: "Detected",
    dotClassName: "bg-status-new",
    icon: "Zap",
  },
  ASSIGNED: {
    label: "Assigned",
    shortLabel: "Assigned",
    dotClassName: "bg-status-assigned",
    icon: "UserCog",
  },
  IN_PROGRESS: {
    label: "In progress",
    shortLabel: "In progress",
    dotClassName: "bg-status-progress",
    icon: "Play",
  },
  WAITING_VERIFICATION: {
    label: "Waiting verification",
    shortLabel: "Verification",
    dotClassName: "bg-status-verify",
    icon: "ShieldCheck",
  },
  VERIFIED: {
    label: "Verified",
    shortLabel: "Verified",
    dotClassName: "bg-status-verified",
    icon: "CircleCheck",
  },
  CLOSED: {
    label: "Closed",
    shortLabel: "Closed",
    dotClassName: "bg-status-closed",
    icon: "Lock",
  },
};

/** Groups that represent work still owed to the business. */
export const OPEN_STATUS_GROUPS: CaseStatusGroup[] = [
  "DETECTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_VERIFICATION",
];

const OPEN_GROUP_SET = new Set<CaseStatusGroup>(OPEN_STATUS_GROUPS);

export function statusGroupOf(status: CaseStatus): CaseStatusGroup {
  return GROUP_BY_STATUS[status];
}

export function statusForGroup(group: CaseStatusGroup): CaseStatus {
  return PRIMARY_STATUS_BY_GROUP[group];
}

export function isOpenStatus(status: CaseStatus): boolean {
  return OPEN_GROUP_SET.has(GROUP_BY_STATUS[status]);
}

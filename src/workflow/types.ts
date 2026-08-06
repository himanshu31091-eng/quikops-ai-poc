import type {
  CaseListItem,
  CaseStatus,
  PriorityBand,
  UserRole,
  VerificationDecision,
} from "@/src/domain/types";

/**
 * The cross-module execution layer.
 *
 * Each module owns its own rich local state — the Work Manager its filters, the
 * case page its actions, evidence and comments. What lives here is only the
 * part of an outcome that another screen needs to know about: a case moved, an
 * owner changed, revenue was recovered.
 *
 * That split is deliberate. A single global store holding everything would make
 * every keystroke on a case a global update; a per-page store means closing a
 * case is invisible to the dashboard. This holds the projection between them.
 */

/** What one case looks like after the work done to it in this session. */
export interface CaseExecutionOverride {
  caseNo: string;
  status?: CaseStatus;
  ownerId?: string | null;
  reviewerId?: string;
  dueAt?: string;
  priorityBand?: PriorityBand;
  assignedAt?: string | null;
  verifiedAt?: string | null;
  closedAt?: string | null;
  /**
   * Set when a case is verified: the exposure stops being "at risk" and starts
   * counting as recovered on the dashboard.
   */
  revenueRecovered?: number;
  /** Plan progress, so the queue can show it without loading the case. */
  actionsTotal?: number;
  actionsDone?: number;
  evidenceCount?: number;
  verificationDecision?: VerificationDecision | null;
  /** When the override was last written, for the activity ordering. */
  at: string;
}

/**
 * A workflow step worth showing on the dashboard's activity feed. Deliberately
 * a small, closed set — this is the executive read of what happened, not the
 * case's own audit trail.
 */
export const WORKFLOW_EVENT_KINDS = [
  "ASSIGNED",
  "WORK_STARTED",
  "ACTION_COMPLETED",
  "EVIDENCE_UPLOADED",
  "VERIFICATION_REQUESTED",
  "VERIFICATION_APPROVED",
  "VERIFICATION_REJECTED",
  "CASE_CLOSED",
  "CASE_CREATED",
  "BULK_ASSIGNED",
  "BULK_CLOSED",
] as const;
export type WorkflowEventKind = (typeof WORKFLOW_EVENT_KINDS)[number];

export interface WorkflowEvent {
  id: string;
  kind: WorkflowEventKind;
  caseNo: string | null;
  actorName: string;
  actorRole: UserRole | null;
  summary: string;
  at: string;
}

export interface ExecutionState {
  /** Keyed by case number — the identifier every module already carries. */
  overrides: Record<string, CaseExecutionOverride>;
  /** Newest first. Capped, because this is a feed and not a log. */
  events: WorkflowEvent[];
  /** Cases raised by hand in the Work Manager during this session. */
  createdCases: CaseListItem[];
  /** Monotonic counter behind generated ids. */
  seq: number;
}

export const EMPTY_EXECUTION_STATE: ExecutionState = {
  overrides: {},
  events: [],
  createdCases: [],
  seq: 0,
};

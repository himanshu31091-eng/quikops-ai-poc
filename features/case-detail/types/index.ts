import type {
  CaseAuditEntry,
  CaseComment,
  CaseEvidence,
  CaseStatus,
  CaseTimelineEvent,
  CorrectiveAction,
  PriorityBand,
  VerificationDecision,
  VerificationRecord,
} from "@/src/domain/types";

/**
 * The mutable half of the case. Everything here starts as a copy of the server
 * record and is changed in-session; the immutable half (the case itself, its
 * detection, its related cases) is read straight from the server model.
 */
export interface CaseSessionState {
  status: CaseStatus;
  ownerId: string | null;
  reviewerId: string;
  dueAt: string;
  priorityBand: PriorityBand;
  actions: CorrectiveAction[];
  evidence: CaseEvidence[];
  comments: CaseComment[];
  verification: VerificationRecord | null;
  /** Seeded events plus everything recorded in this session. */
  timeline: CaseTimelineEvent[];
  audit: CaseAuditEntry[];
  /** Monotonic counter behind ids and timestamps for session-created records. */
  seq: number;
  /** Number of changes made in this session, for the unsaved-changes affordance. */
  changeCount: number;
  /**
   * What the last change touched. Drives the "just happened" highlight across
   * the timeline, the audit log and whichever section the change landed in, so
   * a click in the header is visibly answered further down the page.
   */
  lastChange: LastChange | null;
}

export interface LastChange {
  seq: number;
  timelineId: string;
  auditId: string;
  /** The action, evidence file or comment the change created or edited. */
  targetId: string | null;
  /** Which section to pull the eye to. */
  section: CaseSection | null;
}

export type CaseSection =
  | "timeline"
  | "assignment"
  | "actions"
  | "evidence"
  | "comments"
  | "verification"
  | "audit";

/** One of the five headline commands, while it is settling. */
export type PendingCommand =
  | "assign"
  | "start"
  | "evidence"
  | "request-verification"
  | "decide"
  | null;

export interface NewActionDraft {
  title: string;
  description: string;
  ownerId: string;
  dueAt: string;
}

export interface EvidenceDraft {
  fileName: string;
  kind: CaseEvidence["kind"];
  sizeBytes: number;
  description: string;
  actionId: string | null;
  objectUrl?: string;
}

export interface VerificationDraft {
  decision: VerificationDecision;
  comment: string;
  notes: string;
}

/*
 * Copilot types used to live here. They moved to `components/copilot/types.ts`
 * when the Dashboard gained a portfolio-scoped Copilot: the panel serves two
 * screens now, and a feature may not import from another feature.
 */

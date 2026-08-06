import type { CaseStatus, PriorityBand, VerificationDecision } from "@/src/domain/types";

/** Whether the Copilot is answering with Claude or the offline responder. */
export type CopilotMode = "live" | "offline";

/**
 * What the Copilot is answering about.
 *
 * `case` — one operational record, opened from the case page.
 * `portfolio` — the whole operation, opened from the Executive Dashboard.
 *
 * The two share everything except layer 3 of the prompt: the same route, the
 * same transport, the same panel, the same error handling. Only the context
 * differs, which is the point of having the layers.
 */
export type CopilotScope = "case" | "portfolio";

export interface CopilotTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Work done in the browser since the page loaded.
 *
 * The server owns the case record; the client owns what has happened to it in
 * this session. This is the only case data a client may contribute, it is a
 * closed set of scalars, and every field is validated against the domain before
 * it reaches a prompt — a client can say "this case is now verified", it cannot
 * say what the case is about.
 */
export interface SessionOverlay {
  status?: CaseStatus;
  ownerId?: string | null;
  reviewerId?: string;
  priorityBand?: PriorityBand;
  actionsTotal?: number;
  actionsDone?: number;
  evidenceCount?: number;
  verificationDecision?: VerificationDecision | null;
}

export interface CopilotRequest {
  scope: CopilotScope;
  /** Present for case scope; empty string for portfolio. */
  caseNo: string;
  question: string;
  history: CopilotTurn[];
  overlay: SessionOverlay | null;
}

/** Every way a Copilot call can fail, mapped to what the user should be told. */
export type CopilotFailureKind =
  | "timeout"
  | "rate_limit"
  | "invalid_key"
  | "network"
  | "empty_response"
  | "refused"
  | "unknown";

export interface CopilotFailure {
  kind: CopilotFailureKind;
  /** Shown in the panel. Written for an operations manager, not a developer. */
  message: string;
  /** Whether trying the same question again is likely to help. */
  retryable: boolean;
  status: number;
}

export class CopilotServiceError extends Error {
  readonly failure: CopilotFailure;

  constructor(failure: CopilotFailure) {
    super(failure.message);
    this.name = "CopilotServiceError";
    this.failure = failure;
  }
}

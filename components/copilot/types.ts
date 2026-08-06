import type * as React from "react";
import type { CopilotPromptSpec } from "@/src/ai/prompts/catalogue";
import type { CopilotScope } from "@/src/ai/types";

/**
 * Client-side Copilot contracts.
 *
 * The Copilot serves more than one screen — the case page and the Executive
 * Dashboard — so it lives in `components/` rather than inside a feature. A
 * feature importing from another feature is the one edge this codebase does not
 * allow; shared UI moves down instead.
 */

export type CopilotRole = "user" | "assistant";

export interface CopilotMessage {
  id: string;
  role: CopilotRole;
  content: string;
  /** Assistant messages stream in; true until the final chunk lands. */
  streaming: boolean;
  at: string;
}

export type CopilotTransportMode = "live" | "offline" | "unknown";

/**
 * What the panel is pointed at.
 *
 * Everything here is presentational except `scope` and `caseNo`, which are what
 * the transport actually sends. The strings exist so the same panel can
 * introduce itself correctly at either scope without branching inside the
 * component.
 */
export interface CopilotSubject {
  scope: CopilotScope;
  /** Required at case scope. Ignored at portfolio scope. */
  caseNo?: string;
  /** Shown beside the title — a case number, or a one-line portfolio summary. */
  ref: string;
  /** What the Copilot can and cannot answer about, in one clause. */
  scopeNote: string;
  /** The empty-state blurb, before any question has been asked. */
  intro: React.ReactNode;
  /** Composer placeholder. */
  placeholder: string;
  /** Accessible label for the composer. */
  inputLabel: string;
  /** What the offline badge says the answers are composed from. */
  offlineSource: string;
  /** Suggested prompts for this scope. */
  suggestions: CopilotPromptSpec[];
}

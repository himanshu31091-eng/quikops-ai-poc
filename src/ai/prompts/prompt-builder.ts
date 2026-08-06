import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import type { PortfolioSnapshot } from "@/src/data/queries/portfolio";
import { MAX_CONTEXT_CHARS } from "../config";
import type { CopilotTurn, SessionOverlay } from "../types";
import { boundContext } from "../utils/sanitise";
import { BUSINESS_CONTEXT } from "./business-context";
import { buildCaseContext } from "./case-context";
import { buildPortfolioContext } from "./portfolio-context";
import { SYSTEM_PROMPT } from "./system-prompt";

/**
 * Assembles the four prompt layers into a request.
 *
 * The layering is the point. Layers 1 and 2 — who the assistant is, and how
 * this business works — never change, so they form a byte-identical prefix that
 * is served from the prompt cache on every request after the first. Layers 3
 * and 4 — the subject, and this question — vary, so they sit in the user turn
 * after the cache breakpoint.
 *
 * Scope only affects layer 3. A case question and a portfolio question share
 * the same cached prefix, so opening the Copilot on the dashboard and then on a
 * case costs one cache write, not two.
 *
 * Nothing outside this module builds a prompt. Components pass a subject and a
 * question; string assembly happens here.
 */

export interface PromptLayers {
  /** Frozen blocks, cached. */
  system: { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[];
  /** Prior turns plus the composed question. */
  messages: { role: "user" | "assistant"; content: string }[];
  /** Rendered length of the context, for observability. */
  contextChars: number;
}

export type PromptInput =
  | {
      scope: "case";
      detail: CaseDetailModel;
      question: string;
      history: CopilotTurn[];
      overlay: SessionOverlay | null;
    }
  | {
      scope: "portfolio";
      snapshot: PortfolioSnapshot;
      question: string;
      history: CopilotTurn[];
    };

/** What the record is called in the user turn, per scope. */
const FRAME = {
  case: {
    tag: "case_record",
    preamble: "Here is the complete record for the case on screen.",
  },
  portfolio: {
    tag: "portfolio_record",
    preamble:
      "Here is the current operational position across the plant network, as shown on the Executive Dashboard.",
  },
} as const;

export function buildPrompt(input: PromptInput): PromptLayers {
  const rendered =
    input.scope === "case"
      ? buildCaseContext(input.detail, input.overlay)
      : buildPortfolioContext(input.snapshot);

  const context = boundContext(rendered, MAX_CONTEXT_CHARS);
  const frame = FRAME[input.scope];

  const userTurn = [
    frame.preamble,
    "",
    `<${frame.tag}>`,
    context,
    `</${frame.tag}>`,
    "",
    "<question>",
    input.question,
    "</question>",
  ].join("\n");

  return {
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      {
        type: "text",
        text: BUSINESS_CONTEXT,
        // Breakpoint after the last frozen layer: everything above this is
        // identical on every request in the deployment, at either scope.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: userTurn },
    ],
    contextChars: context.length,
  };
}

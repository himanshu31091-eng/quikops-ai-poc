import { MAX_HISTORY_CHARS, MAX_QUESTION_CHARS } from "../config";
import type { CopilotTurn } from "../types";

/**
 * Input cleaning for anything that reaches a prompt.
 *
 * This is not a claim to defeat prompt injection — no string transform does
 * that, and the real defence is structural: the case record is assembled
 * server-side, the question is delimited, and the system prompt tells the model
 * the delimited span is a question rather than an instruction. What this does
 * is remove the tricks that work on the *rendering* of a prompt: invisible
 * characters, control codes and forged section markers.
 */

/** Control characters and zero-width codepoints, which have no place in a question. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const INVISIBLE = /[\u200B-\u200F\u2028\u2029\uFEFF]/g;

/** Markers the prompt itself uses. A question must not be able to forge one. */
const SECTION_MARKERS =
  /<\/?(case_record|portfolio_record|business_context|question|system)>/gi;

export function sanitiseQuestion(raw: string): string {
  return raw
    .replace(CONTROL_CHARS, " ")
    .replace(INVISIBLE, "")
    .replace(SECTION_MARKERS, "")
    .replace(/[ \t]{3,}/g, "  ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_QUESTION_CHARS);
}

export function sanitiseHistory(turns: CopilotTurn[]): CopilotTurn[] {
  const cleaned: CopilotTurn[] = [];

  for (const turn of turns) {
    const content = turn.content
      .replace(CONTROL_CHARS, " ")
      .replace(INVISIBLE, "")
      .replace(SECTION_MARKERS, "")
      .trim()
      .slice(0, MAX_HISTORY_CHARS);
    if (content === "") continue;
    cleaned.push({ role: turn.role, content });
  }

  // The Messages API requires the first turn to come from the user.
  while (cleaned.length > 0 && cleaned[0]!.role !== "user") cleaned.shift();
  return cleaned;
}

/**
 * Bounds the rendered record, trimming from the middle where the least
 * decision-relevant detail sits, and says so rather than truncating silently.
 */
export function boundContext(context: string, limit: number): string {
  if (context.length <= limit) return context;

  const head = Math.floor(limit * 0.6);
  const tail = limit - head - 120;
  return [
    context.slice(0, head),
    "",
    "[… middle of the record omitted to stay inside the context budget. Ask about a specific section if you need the detail. …]",
    "",
    context.slice(-tail),
  ].join("\n");
}

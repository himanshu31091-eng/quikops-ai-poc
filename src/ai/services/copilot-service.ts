import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import type { PortfolioSnapshot } from "@/src/data/queries/portfolio";
import {
  OFFLINE_CHUNK_DELAY_MS,
  OFFLINE_CHUNK_WORDS,
  COPILOT_MODEL,
} from "../config";
import type { CopilotMode, CopilotRequest } from "../types";
import { streamFromClaude } from "./claude-service";
import { offlineAnswer } from "./offline-service";
import { offlinePortfolioAnswer } from "./offline-portfolio";

/**
 * The Copilot facade.
 *
 * One entry point, two backends and two scopes. Callers get an async iterable
 * of text chunks and cannot tell which path served it — which is exactly what
 * makes the offline fallback safe: the API route, the transport contract and
 * the panel are identical either way.
 */

/** What the Copilot is answering about. Assembled server-side, always. */
export type CopilotSubject =
  | { scope: "case"; detail: CaseDetailModel }
  | { scope: "portfolio"; snapshot: PortfolioSnapshot };

export function resolveMode(): CopilotMode {
  return process.env.ANTHROPIC_API_KEY ? "live" : "offline";
}

export function copilotModel(mode: CopilotMode): string {
  return mode === "live" ? COPILOT_MODEL : "offline";
}

/** Chunks an offline answer so the client renders it exactly like a live stream. */
async function* streamOffline(answer: string): AsyncGenerator<string> {
  const words = answer.match(/[^\s]+\s*/g) ?? [answer];
  let batch = "";

  for (let index = 0; index < words.length; index += 1) {
    batch += words[index];
    const boundary = index % OFFLINE_CHUNK_WORDS === OFFLINE_CHUNK_WORDS - 1;
    if (boundary || index === words.length - 1) {
      yield batch;
      batch = "";
      await new Promise((resolve) => setTimeout(resolve, OFFLINE_CHUNK_DELAY_MS));
    }
  }
}

export async function* streamCopilotAnswer(
  subject: CopilotSubject,
  request: CopilotRequest,
  signal: AbortSignal,
): AsyncGenerator<string> {
  if (resolveMode() === "offline") {
    yield* streamOffline(
      subject.scope === "case"
        ? offlineAnswer(subject.detail, request.question)
        : offlinePortfolioAnswer(subject.snapshot, request.question),
    );
    return;
  }

  yield* streamFromClaude(
    subject.scope === "case"
      ? {
          scope: "case",
          detail: subject.detail,
          question: request.question,
          history: request.history,
          overlay: request.overlay,
        }
      : {
          scope: "portfolio",
          snapshot: subject.snapshot,
          question: request.question,
          history: request.history,
        },
    signal,
  );
}

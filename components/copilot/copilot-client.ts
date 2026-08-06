import type { CopilotScope, SessionOverlay } from "@/src/ai/types";
import type { CopilotMessage, CopilotTransportMode } from "./types";

/**
 * Transport for the Copilot panel.
 *
 * The whole model interaction is behind this one function and the route it
 * calls. The panel knows about text chunks and a mode flag; it has no idea
 * whether the answer came from Claude or from the offline responder, which is
 * what lets the switch happen server-side without touching any UI.
 */

export interface CopilotStreamHandlers {
  onMeta: (mode: CopilotTransportMode, model: string) => void;
  onDelta: (text: string) => void;
}

export interface CopilotStreamRequest {
  scope: CopilotScope;
  /** Empty at portfolio scope — the server assembles the snapshot itself. */
  caseNo: string;
  question: string;
  history: Pick<CopilotMessage, "role" | "content">[];
  /** What the user has changed on screen but not yet saved. Case scope only. */
  overlay: SessionOverlay | null;
  signal: AbortSignal;
}

export class CopilotError extends Error {
  /** True when asking the same question again is likely to work. */
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = "CopilotError";
    this.retryable = retryable;
  }
}

export async function streamCopilotAnswer(
  { scope, caseNo, question, history, overlay, signal }: CopilotStreamRequest,
  handlers: CopilotStreamHandlers,
): Promise<void> {
  const response = await fetch("/api/copilot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      scope,
      caseNo,
      question,
      history: history.map((turn) => ({ role: turn.role, content: turn.content })),
      overlay,
    }),
    signal,
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new CopilotError(
      problem?.error ?? `The Copilot service responded with ${response.status}.`,
      response.status >= 500 || response.status === 429,
    );
  }
  if (!response.body) {
    throw new CopilotError("The Copilot service returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consume = (chunk: string) => {
    if (chunk.trim() === "") return;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(chunk) as Record<string, unknown>;
    } catch {
      return; // A partial line at the tail of a cancelled stream; nothing to do.
    }
    if (event.type === "meta") {
      handlers.onMeta(
        (event.mode as CopilotTransportMode) ?? "unknown",
        typeof event.model === "string" ? event.model : "unknown",
      );
    } else if (event.type === "delta" && typeof event.text === "string") {
      handlers.onDelta(event.text);
    } else if (event.type === "error") {
      throw new CopilotError(
        typeof event.message === "string"
          ? event.message
          : "The Copilot could not complete the answer.",
        event.retryable !== false,
      );
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const chunk of lines) consume(chunk);
  }
  consume(buffer);
}

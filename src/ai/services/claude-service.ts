import Anthropic from "@anthropic-ai/sdk";
import {
  COPILOT_EFFORT,
  COPILOT_MAX_TOKENS,
  COPILOT_MODEL,
  COPILOT_TIMEOUT_MS,
} from "../config";
import { buildPrompt, type PromptInput } from "../prompts/prompt-builder";
import { CopilotServiceError, type CopilotFailure } from "../types";

/**
 * The Claude transport.
 *
 * Owns exactly two things: turning built prompt layers into a stream of text,
 * and turning every way that can fail into a `CopilotFailure` the panel can
 * render. No prompt assembly, no offline logic, no HTTP.
 */

let cachedClient: Anthropic | null = null;

function client(): Anthropic {
  cachedClient ??= new Anthropic({ timeout: COPILOT_TIMEOUT_MS, maxRetries: 1 });
  return cachedClient;
}

/**
 * Maps an SDK error onto something an operations manager can act on. The
 * distinction that matters to them is "try again" versus "tell someone".
 */
export function classifyError(cause: unknown): CopilotFailure {
  if (cause instanceof Anthropic.APIConnectionTimeoutError) {
    return {
      kind: "timeout",
      message:
        "The Copilot took too long to answer. The case is untouched — try again, or ask a narrower question.",
      retryable: true,
      status: 504,
    };
  }

  if (cause instanceof Anthropic.RateLimitError) {
    return {
      kind: "rate_limit",
      message:
        "The Copilot is rate limited right now. Wait a moment and ask again — nothing has been lost.",
      retryable: true,
      status: 429,
    };
  }

  if (cause instanceof Anthropic.AuthenticationError) {
    return {
      kind: "invalid_key",
      message:
        "The Copilot is not configured correctly — its API credentials were rejected. Report this to your administrator; the rest of QuikOps is unaffected.",
      retryable: false,
      status: 502,
    };
  }

  if (cause instanceof Anthropic.PermissionDeniedError) {
    return {
      kind: "invalid_key",
      message:
        "The Copilot's credentials do not have access to this model. Report this to your administrator.",
      retryable: false,
      status: 502,
    };
  }

  if (cause instanceof Anthropic.APIConnectionError) {
    return {
      kind: "network",
      message:
        "The Copilot could not be reached. Check the connection and try again — the case is untouched.",
      retryable: true,
      status: 503,
    };
  }

  if (cause instanceof Anthropic.APIError) {
    return {
      kind: "unknown",
      message: `The Copilot service returned an error (${cause.status ?? "unknown"}). Try again shortly.`,
      retryable: true,
      status: 502,
    };
  }

  return {
    kind: "unknown",
    message: "The Copilot could not complete the answer. Try again shortly.",
    retryable: true,
    status: 500,
  };
}

/** Streams an answer from Claude. Throws `CopilotServiceError` on any failure. */
export async function* streamFromClaude(
  input: PromptInput,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const layers = buildPrompt(input);
  let produced = 0;

  try {
    const stream = client().messages.stream(
      {
        model: COPILOT_MODEL,
        max_tokens: COPILOT_MAX_TOKENS,
        output_config: { effort: COPILOT_EFFORT },
        system: layers.system,
        messages: layers.messages,
      },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        produced += event.delta.text.length;
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();

    if (final.stop_reason === "refusal") {
      throw new CopilotServiceError({
        kind: "refused",
        message:
          "The model declined to answer this question. Rephrase it around the operational decision you need to make, or ask the case owner directly.",
        retryable: false,
        status: 200,
      });
    }

    if (produced === 0) {
      throw new CopilotServiceError({
        kind: "empty_response",
        message:
          "The Copilot returned an empty answer. Try rephrasing the question — the case is untouched.",
        retryable: true,
        status: 502,
      });
    }
  } catch (cause) {
    if (cause instanceof CopilotServiceError) throw cause;
    // A client disconnect is a normal outcome, not a failure to report.
    if (signal.aborted) return;
    throw new CopilotServiceError(classifyError(cause));
  }
}

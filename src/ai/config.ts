/**
 * Every tunable for the Copilot in one place, so cost, latency and safety
 * limits can be reviewed without reading the transport.
 */

/** Claude Opus 5. Thinking is on by default on this model. */
export const COPILOT_MODEL = "claude-opus-5";

/**
 * Effort is the cost and latency lever. `medium` keeps a case-side panel
 * responsive while leaving room to reason over the whole record.
 */
export const COPILOT_EFFORT = "medium" as const;

/**
 * Covers thinking plus the answer. Streaming is mandatory at this size — a
 * non-streaming request this large risks an HTTP timeout.
 */
export const COPILOT_MAX_TOKENS = 16_000;

/** Wall-clock ceiling for a single answer, including thinking. */
export const COPILOT_TIMEOUT_MS = 120_000;

/* ------------------------------------------------------------ Input limits */

/** Longest question accepted. Anything longer is a paste, not a question. */
export const MAX_QUESTION_CHARS = 2_000;

/** Conversation turns replayed for context. */
export const MAX_HISTORY_TURNS = 12;

/** Longest single replayed turn. */
export const MAX_HISTORY_CHARS = 6_000;

/**
 * Ceiling on the rendered case record. Roughly 15k tokens, well inside the
 * window, but bounded so an unusually busy case cannot blow up the bill.
 */
export const MAX_CONTEXT_CHARS = 60_000;

/** Cadence of the offline stream — reads as generation, not a dump. */
export const OFFLINE_CHUNK_WORDS = 4;
export const OFFLINE_CHUNK_DELAY_MS = 18;

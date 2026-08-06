import { MAX_HISTORY_TURNS, MAX_QUESTION_CHARS } from "@/src/ai/config";
import {
  copilotModel,
  resolveMode,
  streamCopilotAnswer,
  type CopilotSubject,
} from "@/src/ai/services/copilot-service";
import {
  CopilotServiceError,
  type CopilotScope,
  type CopilotTurn,
  type SessionOverlay,
} from "@/src/ai/types";
import { sanitiseHistory, sanitiseQuestion } from "@/src/ai/utils/sanitise";
import { getCaseDetail } from "@/src/data/queries/case-detail";
import { getPortfolioSnapshot } from "@/src/data/queries/portfolio";
import { CASE_STATUSES, PRIORITY_BANDS } from "@/src/domain/types";

/**
 * Copilot endpoint.
 *
 * The client sends a case number, a question, and — at most — a small set of
 * scalars describing what it has changed on screen. The case record itself is
 * loaded server-side from the data layer, so a tampered request cannot put
 * words in the model's context, and the API key never leaves this process.
 *
 * The response is newline-delimited JSON rather than SSE: the client is a fetch
 * reader, not an EventSource, and NDJSON keeps the transport byte-identical
 * between the live and offline paths.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CopilotPayload {
  scope?: unknown;
  caseNo?: unknown;
  question?: unknown;
  history?: unknown;
  overlay?: unknown;
}

/** Defaults to case scope, so an older client keeps working unchanged. */
function parseScope(value: unknown): CopilotScope {
  return value === "portfolio" ? "portfolio" : "case";
}

function parseHistory(value: unknown): CopilotTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: CopilotTurn[] = [];

  for (const entry of value.slice(-MAX_HISTORY_TURNS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    turns.push({ role, content });
  }

  return sanitiseHistory(turns);
}

/**
 * The only case data a client may contribute. Every field is checked against
 * the domain: an unknown status or a made-up owner id is dropped rather than
 * rendered into a prompt.
 */
function parseOverlay(value: unknown, knownUserIds: Set<string>): SessionOverlay | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const overlay: SessionOverlay = {};

  if (
    typeof raw.status === "string" &&
    (CASE_STATUSES as readonly string[]).includes(raw.status)
  ) {
    overlay.status = raw.status as SessionOverlay["status"];
  }
  if (raw.ownerId === null) overlay.ownerId = null;
  else if (typeof raw.ownerId === "string" && knownUserIds.has(raw.ownerId)) {
    overlay.ownerId = raw.ownerId;
  }
  if (typeof raw.reviewerId === "string" && knownUserIds.has(raw.reviewerId)) {
    overlay.reviewerId = raw.reviewerId;
  }
  if (
    typeof raw.priorityBand === "string" &&
    (PRIORITY_BANDS as readonly string[]).includes(raw.priorityBand)
  ) {
    overlay.priorityBand = raw.priorityBand as SessionOverlay["priorityBand"];
  }

  const counter = (input: unknown): number | undefined =>
    typeof input === "number" && Number.isInteger(input) && input >= 0 && input <= 500
      ? input
      : undefined;

  const total = counter(raw.actionsTotal);
  const done = counter(raw.actionsDone);
  if (total !== undefined) overlay.actionsTotal = total;
  if (done !== undefined) overlay.actionsDone = done;

  const evidence = counter(raw.evidenceCount);
  if (evidence !== undefined) overlay.evidenceCount = evidence;

  if (
    typeof raw.verificationDecision === "string" &&
    ["APPROVED", "REJECTED", "SENT_BACK"].includes(raw.verificationDecision)
  ) {
    overlay.verificationDecision =
      raw.verificationDecision as SessionOverlay["verificationDecision"];
  }

  return Object.keys(overlay).length > 0 ? overlay : null;
}

function line(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export async function POST(request: Request): Promise<Response> {
  let payload: CopilotPayload;
  try {
    payload = (await request.json()) as CopilotPayload;
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const scope = parseScope(payload.scope);
  const caseNo = typeof payload.caseNo === "string" ? payload.caseNo.trim() : "";
  const rawQuestion = typeof payload.question === "string" ? payload.question : "";

  if (scope === "case" && caseNo === "") {
    return Response.json({ error: "A case number is required." }, { status: 400 });
  }
  if (rawQuestion.trim() === "") {
    return Response.json({ error: "A question is required." }, { status: 400 });
  }
  if (rawQuestion.length > MAX_QUESTION_CHARS * 2) {
    return Response.json(
      { error: `Questions are limited to ${MAX_QUESTION_CHARS} characters.` },
      { status: 413 },
    );
  }

  const question = sanitiseQuestion(rawQuestion);
  if (question === "") {
    return Response.json(
      { error: "That question contained no readable text." },
      { status: 400 },
    );
  }

  // The subject is always assembled here, from the data layer. A client sends a
  // scope and — at case scope — a case number; it never sends content.
  let subject: CopilotSubject;
  let subjectRef: string;

  if (scope === "portfolio") {
    subject = { scope: "portfolio", snapshot: await getPortfolioSnapshot() };
    subjectRef = "portfolio";
  } else {
    const detail = await getCaseDetail(caseNo);
    if (!detail) {
      return Response.json({ error: `Case ${caseNo} was not found.` }, { status: 404 });
    }
    subject = { scope: "case", detail };
    subjectRef = detail.case.caseNo;
  }

  const knownUserIds =
    subject.scope === "case"
      ? new Set([
          ...subject.detail.assignableUsers.map((user) => user.id),
          subject.detail.reviewer.id,
        ])
      : new Set<string>();

  const mode = resolveMode();
  const copilotRequest = {
    scope,
    caseNo: subjectRef,
    question,
    history: parseHistory(payload.history),
    // The overlay describes unsaved work on one case; it has no meaning at
    // portfolio scope, so it is not read there.
    overlay: scope === "case" ? parseOverlay(payload.overlay, knownUserIds) : null,
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        line({
          type: "meta",
          mode,
          model: copilotModel(mode),
          scope,
          caseNo: subjectRef,
        }),
      );

      try {
        for await (const text of streamCopilotAnswer(
          subject,
          copilotRequest,
          request.signal,
        )) {
          if (request.signal.aborted) break;
          controller.enqueue(line({ type: "delta", text }));
        }
        controller.enqueue(line({ type: "done" }));
      } catch (cause) {
        // A client disconnect is a normal outcome, not a failure to report.
        if (!request.signal.aborted) {
          const failure =
            cause instanceof CopilotServiceError
              ? cause.failure
              : {
                  kind: "unknown" as const,
                  message: "The Copilot could not complete the answer.",
                  retryable: true,
                  status: 500,
                };

          console.error("[copilot]", failure.kind, cause);
          controller.enqueue(
            line({
              type: "error",
              kind: failure.kind,
              message: failure.message,
              retryable: failure.retryable,
            }),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-copilot-mode": mode,
    },
  });
}

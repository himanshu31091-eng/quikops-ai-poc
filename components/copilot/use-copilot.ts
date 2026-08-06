"use client";

import * as React from "react";
import type { CopilotScope, SessionOverlay } from "@/src/ai/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { CopilotError, streamCopilotAnswer } from "./copilot-client";
import type { CopilotMessage, CopilotTransportMode } from "./types";

/**
 * Copilot conversation state.
 *
 * Owns the message list, the in-flight request and the abort handle. The
 * transport is behind `streamCopilotAnswer`, so this hook is identical whether
 * the answer comes from Claude or from the offline responder, and identical at
 * case or portfolio scope — the only difference the user sees is the mode badge
 * the server reports.
 */

export interface CopilotApi {
  messages: CopilotMessage[];
  mode: CopilotTransportMode;
  model: string;
  isStreaming: boolean;
  error: { message: string; retryable: boolean } | null;
  /** Re-asks the last question. Only offered when the failure was retryable. */
  retry: () => void;
  send: (question: string) => void;
  stop: () => void;
  reset: () => void;
}

const HISTORY_TURNS = 8;

export interface UseCopilotInput {
  scope: CopilotScope;
  /** Required at case scope; ignored at portfolio scope. */
  caseNo?: string;
  /**
   * Latest-value ref to unsaved case state, so a question asked after three
   * edits reflects those edits without the hook re-subscribing on every
   * keystroke. Case scope only.
   */
  overlayRef?: React.RefObject<SessionOverlay | null>;
}

export function useCopilot({ scope, caseNo, overlayRef }: UseCopilotInput): CopilotApi {
  const [messages, setMessages] = React.useState<CopilotMessage[]>([]);
  const [mode, setMode] = React.useState<CopilotTransportMode>("unknown");
  const [model, setModel] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<{ message: string; retryable: boolean } | null>(
    null,
  );
  const lastQuestionRef = React.useRef<string>("");

  const abortRef = React.useRef<AbortController | null>(null);
  const seqRef = React.useRef(0);
  const messagesRef = React.useRef<CopilotMessage[]>([]);

  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // A question asked about one subject must never stream into another.
  const subjectKey = `${scope}:${caseNo ?? ""}`;
  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [subjectKey],
  );

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((message) => (message.streaming ? { ...message, streaming: false } : message)),
    );
  }, []);

  const reset = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setError(null);
    setMessages([]);
  }, []);

  const send = React.useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (trimmed === "" || abortRef.current !== null) return;

      lastQuestionRef.current = trimmed;
      seqRef.current += 1;
      const stamp = new Date(DEMO_NOW.getTime() + seqRef.current * 1000).toISOString();
      const userMessage: CopilotMessage = {
        id: `msg_u_${seqRef.current}`,
        role: "user",
        content: trimmed,
        streaming: false,
        at: stamp,
      };
      const assistantId = `msg_a_${seqRef.current}`;
      const assistantMessage: CopilotMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        at: stamp,
      };

      const history = messagesRef.current
        .filter((message) => message.content.trim() !== "")
        .slice(-HISTORY_TURNS)
        .map((message) => ({ role: message.role, content: message.content }));

      setError(null);
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      void streamCopilotAnswer(
        {
          scope,
          caseNo: caseNo ?? "",
          question: trimmed,
          history,
          overlay: overlayRef?.current ?? null,
          signal: controller.signal,
        },
        {
          onMeta: (nextMode, nextModel) => {
            setMode(nextMode);
            setModel(nextModel);
          },
          onDelta: (text) => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + text }
                  : message,
              ),
            );
          },
        },
      )
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            cause instanceof CopilotError
              ? { message: cause.message, retryable: cause.retryable }
              : {
                  message:
                    "The Copilot is unavailable. Check the connection and try again.",
                  retryable: true,
                },
          );
        })
        .finally(() => {
          if (abortRef.current === controller) abortRef.current = null;
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, streaming: false } : message,
            ),
          );
        });
    },
    [scope, caseNo, overlayRef],
  );

  /** Drops the failed exchange and re-asks, so the transcript stays clean. */
  const retry = React.useCallback(() => {
    const question = lastQuestionRef.current;
    if (question === "" || abortRef.current !== null) return;
    setMessages((prev) => prev.slice(0, -2));
    setError(null);
    send(question);
  }, [send]);

  return { messages, mode, model, isStreaming, error, retry, send, stop, reset };
}

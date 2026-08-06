"use client";

import * as React from "react";
import { useExecutionStore } from "@/src/workflow/execution-store";

/**
 * Demo reset.
 *
 * `ExecutionProvider` already exposed `reset()`, but each module keeps its own
 * session state — overrides, created rows, replays, filters — in its own hook.
 * Clearing the shared store alone left those behind, so a "reset" produced a
 * half-restored app.
 *
 * This broadcasts instead: one signal, every hook listens. A module opts in by
 * calling `useResetSignal(clearMyLocalState)` and needs no button of its own.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Registers local cleanup. Returns nothing; unsubscribes on unmount. */
export function useResetSignal(onReset: () => void): void {
  const latest = React.useRef(onReset);
  latest.current = onReset;

  React.useEffect(() => {
    const listener = () => latest.current();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

export interface DemoResetApi {
  /** Clears the shared store and every registered module. */
  reset: () => void;
  /** True once anything in the session has changed. */
  isDirty: boolean;
}

export function useDemoReset(): DemoResetApi {
  const { reset: resetStore, isDirty } = useExecutionStore();

  const reset = React.useCallback(() => {
    resetStore();
    for (const listener of listeners) listener();
  }, [resetStore]);

  return { reset, isDirty };
}

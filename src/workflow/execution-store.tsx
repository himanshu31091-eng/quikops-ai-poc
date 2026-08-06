"use client";

import * as React from "react";
import { DEMO_NOW } from "@/src/lib/constants";
import type { CaseListItem, User } from "@/src/domain/types";
import {
  EMPTY_EXECUTION_STATE,
  type CaseExecutionOverride,
  type ExecutionState,
  type WorkflowEvent,
  type WorkflowEventKind,
} from "./types";

/**
 * The store that makes the workflow end-to-end.
 *
 * Mounted on the (app) layout, so it survives navigation between the queue, a
 * case and the dashboard — which is the whole point: closing a case on one
 * screen has to be visible on the other two without a reload.
 *
 * Writers call `recordOutcome`. Readers use the projections in
 * `./projections`, never the raw state, so every screen derives its numbers the
 * same way.
 */

/** Feed length. Beyond this it stops being "recent activity". */
const MAX_EVENTS = 40;

/** Session events are stamped a second apart so ordering is never ambiguous. */
const stampFor = (seq: number): string =>
  new Date(DEMO_NOW.getTime() + seq * 1000).toISOString();

export interface OutcomeInput {
  caseNo: string;
  /** Merged over any existing override for this case. */
  patch: Omit<CaseExecutionOverride, "caseNo" | "at">;
  /** Omit when the change is not worth an executive-level feed entry. */
  event?: {
    kind: WorkflowEventKind;
    summary: string;
    actor: User | null;
  };
}

type Action =
  | { type: "RECORD_OUTCOME"; input: OutcomeInput }
  | { type: "ADD_CREATED_CASE"; item: CaseListItem; actor: User | null }
  | { type: "RESET" };

function reducer(state: ExecutionState, action: Action): ExecutionState {
  switch (action.type) {
    case "RECORD_OUTCOME": {
      const seq = state.seq + 1;
      const at = stampFor(seq);
      const { caseNo, patch, event } = action.input;
      const previous = state.overrides[caseNo];

      const events = event
        ? [
            {
              id: `wfe_${seq}`,
              kind: event.kind,
              caseNo,
              actorName: event.actor?.name ?? "QuikOps",
              actorRole: event.actor?.role ?? null,
              summary: event.summary,
              at,
            } satisfies WorkflowEvent,
            ...state.events,
          ].slice(0, MAX_EVENTS)
        : state.events;

      return {
        ...state,
        seq,
        overrides: {
          ...state.overrides,
          [caseNo]: { ...previous, ...patch, caseNo, at },
        },
        events,
      };
    }

    case "ADD_CREATED_CASE": {
      const seq = state.seq + 1;
      return {
        ...state,
        seq,
        createdCases: [action.item, ...state.createdCases],
        events: [
          {
            id: `wfe_${seq}`,
            kind: "CASE_CREATED",
            caseNo: action.item.caseNo,
            actorName: action.actor?.name ?? "QuikOps",
            actorRole: action.actor?.role ?? null,
            summary: `Case raised by hand — ${action.item.title}`,
            at: stampFor(seq),
          } satisfies WorkflowEvent,
          ...state.events,
        ].slice(0, MAX_EVENTS),
      };
    }

    case "RESET":
      return EMPTY_EXECUTION_STATE;
  }
}

export interface ExecutionStore {
  state: ExecutionState;
  recordOutcome: (input: OutcomeInput) => void;
  addCreatedCase: (item: CaseListItem, actor: User | null) => void;
  reset: () => void;
  /** True once anything has been changed, for "unsaved session" affordances. */
  isDirty: boolean;
}

const ExecutionContext = React.createContext<ExecutionStore | null>(null);

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, EMPTY_EXECUTION_STATE);

  const recordOutcome = React.useCallback(
    (input: OutcomeInput) => dispatch({ type: "RECORD_OUTCOME", input }),
    [],
  );

  const addCreatedCase = React.useCallback(
    (item: CaseListItem, actor: User | null) =>
      dispatch({ type: "ADD_CREATED_CASE", item, actor }),
    [],
  );

  const reset = React.useCallback(() => dispatch({ type: "RESET" }), []);

  const value = React.useMemo<ExecutionStore>(
    () => ({
      state,
      recordOutcome,
      addCreatedCase,
      reset,
      isDirty:
        Object.keys(state.overrides).length > 0 || state.createdCases.length > 0,
    }),
    [state, recordOutcome, addCreatedCase, reset],
  );

  return <ExecutionContext.Provider value={value}>{children}</ExecutionContext.Provider>;
}

/**
 * Read the store. Returns a no-op store when no provider is mounted so a
 * component can be rendered in isolation without special-casing.
 */
export function useExecutionStore(): ExecutionStore {
  const store = React.useContext(ExecutionContext);
  return store ?? FALLBACK_STORE;
}

const noop = () => undefined;

const FALLBACK_STORE: ExecutionStore = {
  state: EMPTY_EXECUTION_STATE,
  recordOutcome: noop,
  addCreatedCase: noop,
  reset: noop,
  isDirty: false,
};

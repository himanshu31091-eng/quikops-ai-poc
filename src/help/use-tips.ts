"use client";

import * as React from "react";

/**
 * Dismissal state for in-app tips.
 *
 * `localStorage`, alongside tour completion (D-60) and for the same reason: a
 * hint that reappears on every reload stops being a hint and becomes an
 * obstacle. This is the second and last thing the product persists locally.
 *
 * Read after hydration rather than during it. A `localStorage` read in the
 * first render would make the server and client markup disagree, and the fix
 * for that is always worse than the one-frame delay — so a tip is hidden until
 * the effect has run, never flashed and withdrawn.
 */

const STORAGE_PREFIX = "qo.tip.";

function storageKey(tipId: string): string {
  return `${STORAGE_PREFIX}${tipId}`;
}

export interface TipState {
  /** False until the stored state has been read, so nothing flashes. */
  isReady: boolean;
  isDismissed: boolean;
  dismiss: () => void;
}

export function useTipDismissal(tipId: string): TipState {
  const [isReady, setIsReady] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setIsDismissed(window.localStorage.getItem(storageKey(tipId)) !== null);
    } catch {
      // Private browsing denies access. A tip that cannot be remembered is
      // better suppressed than shown on every visit.
      setIsDismissed(true);
    }
    setIsReady(true);
  }, [tipId]);

  const dismiss = React.useCallback(() => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(storageKey(tipId), new Date().toISOString());
    } catch {
      // Dismissal still holds for this session; it just will not survive a
      // reload. Failing silently is correct — there is nothing to tell the user.
    }
  }, [tipId]);

  return { isReady, isDismissed, dismiss };
}

/**
 * Clears every dismissal, so the product introduces itself again.
 *
 * Exposed to the demo reset and the user menu: a presenter running the same
 * walkthrough twice needs the first-use tips back, and the alternative is
 * asking them to clear site data between runs.
 */
export function resetAllTips(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key !== null && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear if the store was never readable.
  }
}

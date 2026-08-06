"use client";

import * as React from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab inside an open overlay and restores focus on close.
 *
 * The Copilot panel and the action drawer both use `inert` while closed, which
 * removes them from the tab order correctly — but neither trapped focus while
 * open, so Tab walked out of the dialog and behind the scrim. WCAG 2.2 AA
 * (2.4.3 Focus Order, 2.1.2 No Keyboard Trap) wants both halves.
 */
export function useFocusTrap(open: boolean): React.RefObject<HTMLElement | null> {
  const ref = React.useRef<HTMLElement | null>(null);
  const restoreTo = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    if (!node) return;

    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0]!;
      const last = list[list.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreTo.current?.focus?.();
    };
  }, [open]);

  return ref;
}

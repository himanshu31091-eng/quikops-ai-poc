"use client";

import * as React from "react";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

export type ActionToastTone = "success" | "info";

interface ActionToastProps {
  message: string;
  tone: ActionToastTone;
  onDismiss: () => void;
  /** Optional jump to wherever the change landed. */
  onAction?: () => void;
  actionLabel?: string;
  /**
   * `inline` sits in the document flow, for pages where the controls and the
   * result are both on screen. `floating` anchors to the viewport, for long
   * pages where the user is rarely near the top when the change lands.
   */
  placement?: "inline" | "floating";
  /** Set false where a change really is persisted. */
  sessionOnly?: boolean;
}

const SESSION_NOTE = "Session only — not written to the operational store";

/**
 * Confirmation that a change was recorded.
 *
 * Every mutating surface in the app uses this one component, so "it worked"
 * looks and reads identically whether it came from a bulk close in the queue or
 * an approval on a case.
 */
export function ActionToast({
  message,
  tone,
  onDismiss,
  onAction,
  actionLabel,
  placement = "inline",
  sessionOnly = true,
}: ActionToastProps) {
  const success = tone === "success";

  const body = (
    <div
      className={cn(
        "anim-settle flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5",
        success ? "border-success-line bg-success-subtle" : "border-accent-line bg-accent-subtle",
        placement === "floating" ? "pointer-events-auto w-full max-w-2xl shadow-overlay" : "",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md bg-surface",
          success ? "text-success" : "text-accent",
        )}
      >
        <Icon name={success ? "CircleCheck" : "Info"} size="sm" />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs font-medium leading-snug",
            success ? "text-success-content" : "text-accent-content",
          )}
        >
          {message}
        </p>
        {sessionOnly ? (
          <p className="mt-0.5 text-2xs text-content-tertiary">
            Recorded on the timeline and in the audit log · {SESSION_NOTE.toLowerCase()}
          </p>
        ) : null}
      </div>

      {onAction && actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-sm px-1.5 py-1 text-2xs font-semibold text-accent transition-colors duration-150 hover:text-accent-hover"
        >
          {actionLabel}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-sm text-content-tertiary transition-colors duration-150 hover:text-content"
      >
        <Icon name="X" size="sm" />
      </button>
    </div>
  );

  if (placement === "inline") {
    return (
      <div role="status" aria-live="polite">
        {body}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      {body}
    </div>
  );
}

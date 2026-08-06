"use client";

import * as React from "react";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { cn } from "@/src/lib/cn";

export { FIELD_CLASS } from "@/components/patterns/form-field";
export { ProgressBar } from "@/components/patterns/progress-bar";

/** In-card empty state. Thin alias so sections read consistently. */
export function SectionEmpty(props: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return <EmptyState {...props} size="sm" />;
}

/**
 * Case-page shapes that are not general enough to live in components/patterns.
 * The genuinely shared pieces — progress rail, field styling, empty state — are
 * re-exported from there so sections import from one place.
 */

export function FieldRow({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <span className="flex w-36 shrink-0 items-center gap-1.5 pt-px text-2xs font-medium uppercase tracking-wide text-content-tertiary">
        {icon ? <Icon name={icon} size="xs" /> : null}
        {label}
      </span>
      <span className="min-w-0 flex-1 text-xs leading-relaxed text-content">{children}</span>
    </div>
  );
}

export function SummaryBlock({
  label,
  icon,
  children,
  tone = "default",
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  tone?: "default" | "critical" | "success";
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide",
          tone === "critical"
            ? "text-critical-content"
            : tone === "success"
              ? "text-success-content"
              : "text-content-tertiary",
        )}
      >
        <Icon name={icon} size="xs" />
        {label}
      </p>
      <div className="mt-1.5 text-xs leading-relaxed text-content-secondary">{children}</div>
    </div>
  );
}

/**
 * The "this just changed" treatment, built from the approved row-status
 * transition: the row lands tinted and eases back to normal over 250ms once the
 * highlight expires. One helper so every section flashes identically.
 */
export function recentClass(isRecent: boolean): string {
  return cn(
    "anim-status",
    isRecent ? "bg-accent-subtle ring-1 ring-inset ring-accent-line" : "",
  );
}

/** Spinner used while a headline command settles. */
export function CommandSpinner({ className }: { className?: string }) {
  return (
    <Icon
      name="RefreshCw"
      size="sm"
      className={cn("animate-spin", className)}
    />
  );
}


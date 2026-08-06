"use client";

import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "./icon";

interface RouteErrorProps {
  title: string;
  /** What failed, and — critically — what was not changed by the failure. */
  description: string;
  /** Digest from the Next error boundary, for support to trace. */
  digest?: string;
  onRetry: () => void;
  /** Where to go if retrying is not the answer. */
  fallbackHref: string;
  fallbackLabel: string;
  fallbackIcon?: string;
}

/**
 * The single failure surface for a route.
 *
 * Inline, in-place recovery — no full-page error screens on the demo path. A
 * retry that keeps the user in context is the only acceptable failure mode, and
 * every route says plainly that nothing was mutated so the reader knows a retry
 * is safe.
 */
export function RouteError({
  title,
  description,
  digest,
  onRetry,
  fallbackHref,
  fallbackLabel,
  fallbackIcon,
}: RouteErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-8 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-lg border border-critical-line bg-critical-subtle text-critical">
          <Icon name="TriangleAlert" size="lg" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-content">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-content-secondary">{description}</p>
        {digest ? (
          <p className="mt-3 font-mono text-2xs text-content-tertiary">Reference {digest}</p>
        ) : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" size="md" onClick={onRetry}>
            <Icon name="RefreshCw" size="sm" />
            Retry
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href={fallbackHref}>
              {fallbackIcon ? <Icon name={fallbackIcon} size="sm" /> : null}
              {fallbackLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

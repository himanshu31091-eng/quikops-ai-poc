"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the Audit Log; the shared `RouteError` panel does the rest. */
export default function AuditLogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[audit-log]", error);
  }, [error]);

  return (
    <RouteError
      title="Audit log could not be loaded"
      description="The audit store did not respond. The record itself is append-only and unaffected."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

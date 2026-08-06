"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Execution Analytics; the shared `RouteError` panel does the rest. */
export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[analytics]", error);
  }, [error]);

  return (
    <RouteError
      title="Analytics could not be loaded"
      description="The case store did not respond. Nothing has been changed — the underlying cases and their history are untouched."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

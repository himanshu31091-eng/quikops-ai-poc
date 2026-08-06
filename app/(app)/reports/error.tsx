"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Reports; the shared `RouteError` panel does the rest. */
export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[reports]", error);
  }, [error]);

  return (
    <RouteError
      title="Reports could not be loaded"
      description="The reporting service did not respond. Scheduled deliveries are unaffected."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

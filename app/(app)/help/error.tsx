"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the Help Centre; the shared `RouteError` panel does the rest. */
export default function HelpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[help]", error);
  }, [error]);

  return (
    <RouteError
      title="Help Center could not be loaded"
      description="The documentation did not load. Every screen still works without it."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

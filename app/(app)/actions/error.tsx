"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Action Center; the shared `RouteError` panel does the rest. */
export default function ActionCenterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[action-center]", error);
  }, [error]);

  return (
    <RouteError
      title="Actions could not be loaded"
      description="The action store did not respond. No action, owner or status has been changed."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

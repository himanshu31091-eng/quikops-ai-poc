"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the case detail page; the shared `RouteError` panel does the rest. */
export default function CaseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[case-detail]", error);
  }, [error]);

  return (
    <RouteError
      title="This case could not be loaded"
      description="The case store did not respond. No assignment, action, evidence or verification has been changed."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/work"
      fallbackLabel="Back to Work Manager"
      fallbackIcon="ArrowLeft"
    />
  );
}

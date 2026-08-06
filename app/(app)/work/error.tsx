"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

export default function WorkManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[work-manager]", error);
  }, [error]);

  return (
    <RouteError
      title="Cases could not be loaded"
      description="The case store did not respond. No case, assignment or status has been changed."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

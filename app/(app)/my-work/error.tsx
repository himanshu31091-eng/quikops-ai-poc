"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for My Work; the shared `RouteError` panel does the rest. */
export default function MyWorkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[my-work]", error);
  }, [error]);

  return (
    <RouteError
      title="Your work could not be loaded"
      description="The case store did not respond. No assignment or action has been changed."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/work"
      fallbackLabel="Open Work Manager"
    />
  );
}

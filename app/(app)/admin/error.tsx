"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Administration; the shared `RouteError` panel does the rest. */
export default function AdministrationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[administration]", error);
  }, [error]);

  return (
    <RouteError
      title="Configuration could not be loaded"
      description="The configuration store did not respond. No setting has been changed."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

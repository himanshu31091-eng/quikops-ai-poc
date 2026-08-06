"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Connector Health; the shared `RouteError` panel does the rest. */
export default function ConnectorHealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[connector-health]", error);
  }, [error]);

  return (
    <RouteError
      title="Connector state could not be loaded"
      description="The integration monitor did not respond. Ingestion itself is unaffected — this is the view, not the pipeline."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

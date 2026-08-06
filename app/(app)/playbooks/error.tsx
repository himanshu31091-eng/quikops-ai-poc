"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the Playbook library; the shared `RouteError` panel does the rest. */
export default function PlaybooksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[playbooks]", error);
  }, [error]);

  return (
    <RouteError
      title="Playbook library could not be loaded"
      description="The template store did not respond. Existing case plans are unaffected."
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

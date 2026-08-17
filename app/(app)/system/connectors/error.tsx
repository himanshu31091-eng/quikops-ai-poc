"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Connector Health; the shared `RouteError` panel does the rest. */
export default function ConnectorHealthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[connector-health]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.connectorStateCouldNotBe")}
      description={t("page.theIntegrationMonitorDidNot")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

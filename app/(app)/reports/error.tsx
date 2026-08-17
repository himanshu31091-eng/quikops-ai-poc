"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Reports; the shared `RouteError` panel does the rest. */
export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[reports]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.reportsCouldNotBeLoaded")}
      description={t("page.theReportingServiceDidNot")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

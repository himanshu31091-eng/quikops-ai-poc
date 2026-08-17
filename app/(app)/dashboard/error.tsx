"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the Executive Dashboard; the shared `RouteError` panel does the rest. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.dashboardCouldNotBeLoaded")}
      description={t("page.theOperationalDataServiceDid")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Reload page"
    />
  );
}

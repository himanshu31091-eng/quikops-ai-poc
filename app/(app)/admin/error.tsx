"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Administration; the shared `RouteError` panel does the rest. */
export default function AdministrationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[administration]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.configurationCouldNotBeLoaded")}
      description={t("page.theConfigurationStoreDidNot")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

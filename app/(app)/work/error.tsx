"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for Work Manager; the shared `RouteError` panel does the rest. */
export default function WorkManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[work-manager]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.casesCouldNotBeLoaded")}
      description={t("page.theCaseStoreDidNot3")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

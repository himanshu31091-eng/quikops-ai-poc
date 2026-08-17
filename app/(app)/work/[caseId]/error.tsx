"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the case detail page; the shared `RouteError` panel does the rest. */
export default function CaseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[case-detail]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.thisCaseCouldNotBe")}
      description={t("page.theCaseStoreDidNot4")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/work"
      fallbackLabel="Back to Work Manager"
      fallbackIcon="ArrowLeft"
    />
  );
}

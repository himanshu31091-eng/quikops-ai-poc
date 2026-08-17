"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for My Work; the shared `RouteError` panel does the rest. */
export default function MyWorkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[my-work]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.yourWorkCouldNotBe")}
      description={t("page.theCaseStoreDidNot2")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/work"
      fallbackLabel="Open Work Manager"
    />
  );
}

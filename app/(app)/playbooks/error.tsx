"use client";

import { useEffect } from "react";
import { useTranslation } from "@/src/i18n/provider";
import { RouteError } from "@/components/patterns/route-error";

/** Error boundary for the Playbook library; the shared `RouteError` panel does the rest. */
export default function PlaybooksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    console.error("[playbooks]", error);
  }, [error]);

  return (
    <RouteError
      title={t("page.playbookLibraryCouldNotBe")}
      description={t("page.theTemplateStoreDidNot")}
      {...(error.digest ? { digest: error.digest } : {})}
      onRetry={reset}
      fallbackHref="/dashboard"
      fallbackLabel="Back to dashboard"
    />
  );
}

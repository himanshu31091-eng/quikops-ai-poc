"use client";

import { useEffect } from "react";
import { RouteError } from "@/components/patterns/route-error";

/**
 * Error boundary for the sign-in screen.
 *
 * The only route outside the app shell, and the first thing anyone sees — so a
 * failure here has to look like the product rather than the framework's default
 * error page. The fallback is the sign-in screen itself: there is nowhere else
 * to send someone who is not signed in yet.
 */
export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[login]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface">
        <RouteError
          title="Sign-in is unavailable"
          description="The identity provider did not respond. No credentials were submitted."
          {...(error.digest ? { digest: error.digest } : {})}
          onRetry={reset}
          fallbackHref="/login"
          fallbackLabel="Reload sign-in"
          fallbackIcon="RefreshCw"
        />
      </div>
    </div>
  );
}

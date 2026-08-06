import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";

/**
 * A case number that does not resolve. Recoverable — the queue is one click
 * away, and the copy says what a wrong case number usually means.
 */
export default function CaseNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface">
        <EmptyState
          icon="SearchX"
          title="Case not found"
          description="No case with that number exists in this deployment. It may have been closed and archived, or the number may be from another environment."
          action={
            <div className="flex items-center gap-2">
              <Button variant="primary" size="md" asChild>
                <Link href="/work">
                  <Icon name="Rows3" size="sm" />
                  Open Work Manager
                </Link>
              </Button>
              <Button variant="secondary" size="md" asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}

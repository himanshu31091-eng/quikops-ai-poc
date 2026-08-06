import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface">
        <EmptyState
          icon="CircleHelp"
          title="Page not found"
          description="The route you requested does not exist in this build. Check the navigation for available modules."
          action={
            <Button variant="primary" size="md" asChild>
              <a href="/dashboard">Back to dashboard</a>
            </Button>
          }
        />
      </div>
    </div>
  );
}

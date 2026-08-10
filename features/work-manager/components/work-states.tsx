"use client";

import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/src/lib/format";

/** Filters are applied and nothing matched. Recoverable — say how. */
export function NoResultsState({
  filterCount,
  totalCount,
  onClearFilters,
}: {
  filterCount: number;
  totalCount: number;
  onClearFilters: () => void;
}) {
  return (
    <EmptyState
      icon="SearchX"
      title="No cases match these filters"
      description={`${formatNumber(filterCount)} filter${
        filterCount === 1 ? "" : "s"
      } are narrowing ${formatNumber(totalCount)} cases down to none. Remove one to widen the search.`}
      action={
        <Button variant="primary" size="md" onClick={onClearFilters}>
          <Icon name="X" size="sm" />
          Clear all filters
        </Button>
      }
      className="py-16"
    />
  );
}

/** There is genuinely nothing in the store — a different problem entirely. */
export function NoDataState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon="Inbox"
      title="No operational cases yet"
      description="Nothing has been ingested from the connected enterprise data platform and no case has been raised by hand. Cases appear here automatically as soon as the next connector run completes."
      action={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={onCreate}>
            <Icon name="Plus" size="sm" />
            Create case
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/system/connectors">
              <Icon name="PlugZap" size="sm" />
              Connector health
            </Link>
          </Button>
        </div>
      }
      className="py-16"
    />
  );
}

"use client";

import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/src/lib/format";
import { useTranslation } from "@/src/i18n/provider";

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
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="SearchX"
      title={t("work.noMatch")}
      description={`${formatNumber(filterCount)} filter${
        filterCount === 1 ? "" : "s"
      } are narrowing ${formatNumber(totalCount)} cases down to none. Remove one to widen the search.`}
      action={
        <Button variant="primary" size="md" onClick={onClearFilters}>
          <Icon name="X" size="sm" />
          {t("work.clearAllFilters")}
        </Button>
      }
      className="py-16"
    />
  );
}

/** There is genuinely nothing in the store — a different problem entirely. */
export function NoDataState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="Inbox"
      title={t("work.noCases")}
      description={t("work.noCasesBody")}
      action={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={onCreate}>
            <Icon name="Plus" size="sm" />
            {t("work.createCase")}
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/system/connectors">
              <Icon name="PlugZap" size="sm" />
              {t("work.connectorHealth")}
            </Link>
          </Button>
        </div>
      }
      className="py-16"
    />
  );
}

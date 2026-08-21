"use client";

import * as React from "react";
import type { Translate } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type {
  MultiFilterField,
  SortKey,
  WorkFacets,
  WorkFilters,
  WorkSort,
} from "../types";
import { SORT_META } from "../utils/filter-definitions";
import { FilterMenu } from "@/components/patterns/filter-menu";

/**
 * Work Manager's filter bar.
 *
 * Predates the shared `ModuleToolbar` and stays as it is: Work Manager is a
 * frozen module, and its saved views and board/table switch are not part of
 * the shared toolbar's contract. New modules use `ModuleToolbar`.
 */
interface FilterBarProps {
  facets: WorkFacets;
  filters: WorkFilters;
  sort: WorkSort;
  resultCount: number;
  totalCount: number;
  isFiltered: boolean;
  onToggleValue: (field: MultiFilterField, value: string) => void;
  onClearField: (field: MultiFilterField) => void;
  onClearAll: () => void;
  onSort: (key: SortKey) => void;
}

/** Built rather than declared, because the menu labels come from the catalogue
 *  and a module-scope table is evaluated before a locale is known. */
const buildMenus = (
  t: Translate,
): {
  field: MultiFilterField;
  label: string;
  icon: string;
  searchable?: boolean;
}[] => [
  { field: "plants", label: t("col.plant"), icon: "Factory" },
  { field: "priorities", label: t("col.priority"), icon: "Target" },
  { field: "statusGroups", label: t("col.status"), icon: "Activity" },
  { field: "categories", label: t("col.category"), icon: "Tag" },
  { field: "revenueBands", label: t("col.revenueImpact"), icon: "DollarSign" },
  { field: "owners", label: t("col.owner"), icon: "Users", searchable: true },
  { field: "detectedBy", label: t("case.detectedBy"), icon: "PlugZap" },
];

const SORT_OPTIONS: SortKey[] = [
  "priority",
  "revenue",
  "due",
  "age",
  "detected",
  "plant",
  "status",
  "owner",
  "caseNo",
];

export const FilterBar = React.memo(function FilterBar({
  facets,
  filters,
  sort,
  resultCount,
  totalCount,
  isFiltered,
  onToggleValue,
  onClearField,
  onClearAll,
  onSort,
}: FilterBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 pr-0.5 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
        <Icon name="Filter" size="xs" />
        {t("workManager.filter")}
      </span>

      {buildMenus(t).map((menu) => (
        <FilterMenu
          key={menu.field}
          label={menu.label}
          icon={menu.icon}
          field={menu.field}
          options={facets[menu.field]}
          selected={filters[menu.field] as string[]}
          onToggle={onToggleValue}
          onClear={onClearField}
          searchable={menu.searchable ?? false}
        />
      ))}

      {isFiltered ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content"
        >
          <Icon name="X" size="sm" />
          {t("actionCenter.clearAll")}
        </button>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <span
          aria-live="polite"
          className={cn(
            "text-xs tabular-nums",
            isFiltered ? "text-content-secondary" : "text-content-tertiary",
          )}
        >
          <span className="font-semibold text-content">{formatNumber(resultCount)}</span>
          {" of "}
          {formatNumber(totalCount)} cases
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-control bg-surface px-2.5 text-xs font-medium text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content"
            >
              <Icon name="ArrowUpDown" size="sm" />
              <span className="hidden sm:inline">{SORT_META[sort.key].label}</span>
              <Icon
                name={sort.direction === "asc" ? "ArrowUp" : "ArrowDown"}
                size="xs"
                className="text-content-tertiary"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{t("workManager.sortBy")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SORT_OPTIONS.map((key) => (
              <DropdownMenuItem key={key} onSelect={() => onSort(key)}>
                <span className="flex-1">{SORT_META[key].label}</span>
                {sort.key === key ? (
                  <Icon
                    name={sort.direction === "asc" ? "ArrowUp" : "ArrowDown"}
                    size="sm"
                    className="text-accent"
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

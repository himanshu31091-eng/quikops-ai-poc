"use client";

import * as React from "react";
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

const MENUS: {
  field: MultiFilterField;
  label: string;
  icon: string;
  searchable?: boolean;
}[] = [
  { field: "plants", label: "Plant", icon: "Factory" },
  { field: "priorities", label: "Priority", icon: "Target" },
  { field: "statusGroups", label: "Status", icon: "Activity" },
  { field: "categories", label: "Category", icon: "Tag" },
  { field: "revenueBands", label: "Revenue impact", icon: "DollarSign" },
  { field: "owners", label: "Owner", icon: "Users", searchable: true },
  { field: "detectedBy", label: "Detected by", icon: "PlugZap" },
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 pr-0.5 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
        <Icon name="Filter" size="xs" />
        Filter
      </span>

      {MENUS.map((menu) => (
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
          Clear all
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
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content"
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
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
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

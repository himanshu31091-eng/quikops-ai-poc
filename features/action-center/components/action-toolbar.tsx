"use client";

import * as React from "react";
import { FilterMenu, type FilterOption } from "@/components/patterns/filter-menu";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/cn";
import type { ActionFilterField, ActionFilters, ActiveFilterChip } from "../types";

/**
 * Search, facets and the two whole-view controls.
 *
 * Active filters are shown as removable chips beneath the row rather than only
 * as counts on the menus: a manager who has narrowed to three plants and two
 * priorities needs to see what is excluded without opening four menus.
 */

interface ActionToolbarProps {
  filters: ActionFilters;
  facets: {
    plants: FilterOption[];
    priorities: FilterOption[];
    statuses: FilterOption[];
    owners: FilterOption[];
  };
  chips: ActiveFilterChip[];
  isFiltered: boolean;
  isRefreshing: boolean;
  resultCount: number;
  onSearch: (value: string) => void;
  onToggle: (field: ActionFilterField, value: string) => void;
  onClearField: (field: ActionFilterField) => void;
  onRemoveChip: (chipId: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export function ActionToolbar({
  filters,
  facets,
  chips,
  isFiltered,
  isRefreshing,
  resultCount,
  onSearch,
  onToggle,
  onClearField,
  onRemoveChip,
  onClearAll,
  onRefresh,
  onExport,
}: ActionToolbarProps) {
  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 sm:max-w-md">
          <Icon name="Search" size="sm" className="shrink-0 text-content-tertiary" />
          <input
            value={filters.search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search actions, cases, owners, suppliers"
            aria-label="Search actions"
            className="w-full bg-transparent text-xs text-content outline-none placeholder:text-content-tertiary"
          />
          {filters.search !== "" ? (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="shrink-0 text-content-tertiary transition-colors duration-150 hover:text-content"
            >
              <Icon name="X" size="xs" />
            </button>
          ) : null}
        </div>

        <FilterMenu
          label="Plant"
          icon="Factory"
          field="plants"
          options={facets.plants}
          selected={filters.plants}
          onToggle={onToggle}
          onClear={onClearField}
        />
        <FilterMenu
          label="Priority"
          icon="Target"
          field="priorities"
          options={facets.priorities}
          selected={filters.priorities}
          onToggle={onToggle}
          onClear={onClearField}
        />
        <FilterMenu
          label="Status"
          icon="CircleCheck"
          field="statuses"
          options={facets.statuses}
          selected={filters.statuses}
          onToggle={onToggle}
          onClear={onClearField}
        />
        <FilterMenu
          label="Owner"
          icon="UserCog"
          field="owners"
          options={facets.owners}
          selected={filters.owners}
          onToggle={onToggle}
          onClear={onClearField}
          searchable
        />

        <span className="ml-auto flex items-center gap-2">
          <span className="text-2xs tabular-nums text-content-tertiary">
            {resultCount} action{resultCount === 1 ? "" : "s"}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <Icon
              name="RefreshCw"
              size="sm"
              className={cn(isRefreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Icon name="Download" size="sm" />
            Export
          </Button>
        </span>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onRemoveChip(chip.id)}
              className="inline-flex h-6 items-center gap-1 rounded-sm border border-accent-line bg-accent-subtle px-2 text-2xs text-accent-content transition-colors duration-150 hover:border-accent hover:bg-surface"
            >
              <span className="text-content-tertiary">{chip.group}</span>
              {chip.label}
              <Icon name="X" size="xs" />
            </button>
          ))}
          {isFiltered ? (
            <Button variant="ghost" size="xs" onClick={onClearAll}>
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

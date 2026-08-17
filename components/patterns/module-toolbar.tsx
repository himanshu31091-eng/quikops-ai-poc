"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import { FilterMenu, type FilterOption } from "@/components/patterns/filter-menu";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/cn";

/**
 * Search, facets, active-filter chips and the whole-view actions.
 *
 * The Work Manager, the Action Center and Connector Health each built this row
 * independently. The differences were cosmetic — a chip here, a count there —
 * and the drift was already visible. This owns the layout and the behaviour;
 * callers declare which facets exist.
 *
 * Hidden in print, because a PDF should show the report rather than the
 * controls that produced it.
 */

export interface ToolbarFacet<Field extends string> {
  field: Field;
  label: string;
  icon: string;
  options: FilterOption[];
  selected: string[];
  searchable?: boolean;
}

export interface ToolbarChip {
  id: string;
  group: string;
  label: string;
}

interface ModuleToolbarProps<Field extends string> {
  search?: {
    value: string;
    placeholder: string;
    ariaLabel: string;
    onChange: (value: string) => void;
  };
  facets?: ToolbarFacet<Field>[];
  onToggleFacet?: (field: Field, value: string) => void;
  onClearFacet?: (field: Field) => void;

  chips?: ToolbarChip[];
  onRemoveChip?: (id: string) => void;

  isFiltered?: boolean;
  onClearAll?: () => void;

  /** Right-aligned summary, e.g. "19 cases in scope". */
  resultLabel?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Export controls, or anything else the module wants on the right. */
  actions?: React.ReactNode;
  className?: string;
}

export function ModuleToolbar<Field extends string>({
  search,
  facets = [],
  onToggleFacet,
  onClearFacet,
  chips = [],
  onRemoveChip,
  isFiltered = false,
  onClearAll,
  resultLabel,
  onRefresh,
  isRefreshing = false,
  actions,
  className,
}: ModuleToolbarProps<Field>) {
  const { t } = useTranslation();
  return (
    <div className={cn("space-y-2 print:hidden", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search ? (
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 sm:max-w-md">
            <Icon name="Search" size="sm" className="shrink-0 text-content-tertiary" />
            <input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder}
              aria-label={search.ariaLabel}
              className="w-full bg-transparent text-xs text-content outline-none placeholder:text-content-tertiary"
            />
            {search.value !== "" ? (
              <button
                type="button"
                onClick={() => search.onChange("")}
                aria-label={t("work.clearSearch")}
                className="shrink-0 text-content-tertiary transition-colors duration-150 hover:text-content"
              >
                <Icon name="X" size="xs" />
              </button>
            ) : null}
          </div>
        ) : null}

        {facets.map((facet) => (
          <FilterMenu
            key={facet.field}
            label={facet.label}
            icon={facet.icon}
            field={facet.field}
            options={facet.options}
            selected={facet.selected}
            onToggle={(field, value) => onToggleFacet?.(field, value)}
            onClear={(field) => onClearFacet?.(field)}
            {...(facet.searchable ? { searchable: true } : {})}
          />
        ))}

        {isFiltered && onClearAll ? (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <Icon name="X" size="xs" />
            {t("common.clearFilters")}
          </Button>
        ) : null}

        <span className="ml-auto flex items-center gap-2">
          {resultLabel ? (
            <span className="text-2xs tabular-nums text-content-tertiary">{resultLabel}</span>
          ) : null}
          {onRefresh ? (
            <Button variant="secondary" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <Icon name="RefreshCw" size="sm" className={cn(isRefreshing && "animate-spin")} />
              {t("common.refresh")}
            </Button>
          ) : null}
          {actions}
        </span>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onRemoveChip?.(chip.id)}
              className="inline-flex h-6 items-center gap-1 rounded-sm border border-accent-line bg-accent-subtle px-2 text-2xs text-accent-content transition-colors duration-150 hover:border-accent hover:bg-surface"
            >
              <span className="text-content-tertiary">{chip.group}</span>
              {chip.label}
              <Icon name="X" size="xs" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

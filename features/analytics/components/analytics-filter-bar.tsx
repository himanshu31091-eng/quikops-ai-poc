"use client";

import * as React from "react";
import { FilterMenu, type FilterOption } from "@/components/patterns/filter-menu";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/src/lib/cn";
import type { DATE_RANGES } from "../utils/analytics-filters";
import type {
  AnalyticsFilterField,
  AnalyticsFilters,
  DateRangeKey,
} from "../types";

/**
 * Filters and exports.
 *
 * The date range is a segmented control rather than a fifth menu: it is
 * single-select, always has a value, and a manager changes it far more often
 * than the facets. Hidden in print — a PDF should show the report, not the
 * controls that produced it.
 */

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters;
  facets: { plants: FilterOption[]; priorities: FilterOption[]; categories: FilterOption[] };
  ranges: typeof DATE_RANGES;
  isFiltered: boolean;
  caseCount: number;
  onToggle: (field: AnalyticsFilterField, value: string) => void;
  onClear: (field: AnalyticsFilterField) => void;
  onSetRange: (range: DateRangeKey) => void;
  onClearAll: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

export function AnalyticsFilterBar({
  filters,
  facets,
  ranges,
  isFiltered,
  caseCount,
  onToggle,
  onClear,
  onSetRange,
  onClearAll,
  onExportCsv,
  onExportPdf,
}: AnalyticsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-subtle p-0.5">
        {ranges.map((range) => (
          <button
            key={range.key}
            type="button"
            onClick={() => onSetRange(range.key)}
            className={cn(
              "h-7 rounded-sm px-2.5 text-2xs transition-colors duration-150",
              range.key === filters.range
                ? "bg-surface font-semibold text-content shadow-raised"
                : "font-medium text-content-tertiary hover:text-content",
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      <span className="h-5 w-px bg-line" aria-hidden />

      <FilterMenu
        label="Plant"
        icon="Factory"
        field="plants"
        options={facets.plants}
        selected={filters.plants}
        onToggle={onToggle}
        onClear={onClear}
      />
      <FilterMenu
        label="Priority"
        icon="Target"
        field="priorities"
        options={facets.priorities}
        selected={filters.priorities}
        onToggle={onToggle}
        onClear={onClear}
      />
      <FilterMenu
        label="Exception type"
        icon="OctagonAlert"
        field="categories"
        options={facets.categories}
        selected={filters.categories}
        onToggle={onToggle}
        onClear={onClear}
        searchable
      />

      {isFiltered ? (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <Icon name="X" size="xs" />
          Clear filters
        </Button>
      ) : null}

      <span className="ml-auto flex items-center gap-2">
        <span className="text-2xs text-content-tertiary tabular-nums">
          {caseCount} case{caseCount === 1 ? "" : "s"} in scope
        </span>
        <Button variant="secondary" size="sm" onClick={onExportCsv}>
          <Icon name="Download" size="sm" />
          CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={onExportPdf}>
          <Icon name="FileText" size="sm" />
          PDF
        </Button>
      </span>
    </div>
  );
}

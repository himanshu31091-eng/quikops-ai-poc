"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/src/lib/cn";

/**
 * One multi-select facet control, reused by every module that filters a working
 * set — the Work Manager queue and Execution Analytics today.
 *
 * Lives here rather than inside a feature because two features need it, and a
 * feature may not import from another feature. Generic over the field key so
 * each module keeps its own narrow union rather than falling back to `string`.
 */

/** One selectable value, with a live count from the current working set. */
export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
  count: number;
  dotClassName?: string;
  icon?: string;
}

interface FilterMenuProps<Field extends string> {
  label: string;
  icon: string;
  /**
   * Which facet this menu edits. Passed back to the handlers so the parent can
   * hand every menu the same two stable callbacks instead of a fresh closure
   * per menu per render.
   */
  field: Field;
  options: FilterOption[];
  selected: string[];
  onToggle: (field: Field, value: string) => void;
  onClear: (field: Field) => void;
  /** Shows a type-ahead inside the menu once the list gets long. */
  searchable?: boolean;
}

function FilterMenuInner<Field extends string>({
  label,
  icon,
  field,
  options,
  selected,
  onToggle,
  onClear,
  searchable = false,
}: FilterMenuProps<Field>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.hint?.toLowerCase().includes(needle) ?? false),
    );
  }, [options, query]);

  const active = selected.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
            active
              ? "border-accent-line bg-accent-subtle text-accent-content"
              : "border-line bg-surface text-content-secondary hover:bg-surface-hover hover:text-content",
          )}
        >
          <Icon name={icon} size="sm" className={active ? "text-accent" : undefined} />
          {label}
          {active ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-2xs font-semibold text-white tabular-nums">
              {selected.length}
            </span>
          ) : (
            <Icon name="ChevronDown" size="xs" className="text-content-tertiary" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
            {label}
          </span>
          {active ? (
            <button
              type="button"
              onClick={() => onClear(field)}
              className="text-2xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover"
            >
              Clear
            </button>
          ) : null}
        </div>

        {searchable ? (
          <div className="border-b border-line px-2 py-2">
            <div className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface-subtle px-2">
              <Icon name="Search" size="xs" className="text-content-tertiary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Filter ${label.toLowerCase()}`}
                className="w-full bg-transparent text-xs text-content outline-none placeholder:text-content-tertiary"
              />
            </div>
          </div>
        ) : null}

        <div className="max-h-72 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-content-tertiary">
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            visible.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => onToggle(field, option.value)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
                    "hover:bg-surface-hover",
                    option.count === 0 && !checked ? "opacity-50" : "",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150",
                      checked
                        ? "border-accent bg-accent text-white"
                        : "border-line-strong bg-surface",
                    )}
                  >
                    {checked ? <Icon name="Check" size="xs" strokeWidth={3} /> : null}
                  </span>

                  {option.dotClassName ? (
                    <span className={cn("size-2 shrink-0 rounded-full", option.dotClassName)} />
                  ) : option.icon ? (
                    <Icon name={option.icon} size="sm" className="text-content-tertiary" />
                  ) : null}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-content">
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="block truncate text-2xs text-content-tertiary">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>

                  <span className="shrink-0 text-2xs tabular-nums text-content-tertiary">
                    {option.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * `as typeof FilterMenuInner` preserves generic inference through `React.memo`,
 * which otherwise widens the type parameter and forces every caller to annotate.
 */
export const FilterMenu = React.memo(FilterMenuInner) as typeof FilterMenuInner;

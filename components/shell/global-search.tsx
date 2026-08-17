"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icon } from "@/components/patterns/icon";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { NAVIGATION } from "@/src/config/app-config";
import type { PriorityBand } from "@/src/domain/types";
import { caseHref } from "@/src/lib/routes";
import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/i18n/provider";

/**
 * Command-palette search over cases and navigation.
 *
 * Opens on Cmd/Ctrl+K. Searches the case corpus the server already sent for
 * the shell rather than calling an endpoint, which is what keeps the palette
 * instant — the demo corpus is small enough to filter in the browser.
 */
export interface SearchableCase {
  caseNo: string;
  title: string;
  plantCode: string;
  priorityBand: PriorityBand;
}

interface GlobalSearchProps {
  cases: SearchableCase[];
}

const MAX_RESULTS_PER_GROUP = 5;

export function GlobalSearch({ cases }: GlobalSearchProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const normalised = query.trim().toLowerCase();

  const caseResults = React.useMemo(() => {
    if (!normalised) return cases.slice(0, MAX_RESULTS_PER_GROUP);
    return cases
      .filter(
        (c) =>
          c.caseNo.toLowerCase().includes(normalised) ||
          c.title.toLowerCase().includes(normalised) ||
          c.plantCode.toLowerCase().includes(normalised),
      )
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [cases, normalised]);

  const navResults = React.useMemo(() => {
    const flat = NAVIGATION.flatMap((section) => section.items);
    if (!normalised) return [];
    return flat
      .filter((item) => item.label.toLowerCase().includes(normalised))
      .slice(0, MAX_RESULTS_PER_GROUP);
  }, [normalised]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-line bg-surface-subtle px-2.5",
            "text-sm text-content-tertiary transition-colors duration-150",
            "hover:border-line-strong hover:bg-surface",
          )}
        >
          <Icon name="Search" size="sm" />
          <span className="flex-1 text-left">{t("shell.searchCollapsed")}</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-2xs text-content-tertiary sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-xl p-0">
        <DialogTitle className="sr-only">{t("shell.globalSearch")}</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Icon name="Search" size="md" className="text-content-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("shell.searchPlaceholder")}
            // An input carries an intrinsic min-width of about 20 characters,
            // so without min-w-0 it refuses to shrink and pushes the ESC key
            // out of the dialog at narrow widths.
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-content outline-none placeholder:text-content-tertiary"
          />
          <kbd className="rounded border border-line bg-surface-subtle px-1.5 py-0.5 font-mono text-2xs text-content-tertiary">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-1.5">
          {caseResults.length === 0 && navResults.length === 0 ? (
            <p className="px-2.5 py-8 text-center text-sm text-content-tertiary">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : null}

          {caseResults.length > 0 ? (
            <>
              <p className="px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">
                {normalised ? "Cases" : t("shell.recentCritical")}
              </p>
              {caseResults.map((result) => (
                <Link
                  key={result.caseNo}
                  href={caseHref(result.caseNo)}
                  onClick={close}
                  className="flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors duration-150 hover:bg-surface-hover"
                >
                  <span className="shrink-0 font-mono text-2xs text-content-tertiary">
                    {result.caseNo}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-content">
                    {result.title}
                  </span>
                  <span className="shrink-0 font-mono text-2xs text-content-tertiary">
                    {result.plantCode}
                  </span>
                  <PriorityChip band={result.priorityBand} size="sm" />
                </Link>
              ))}
            </>
          ) : null}

          {navResults.length > 0 ? (
            <>
              <p className="mt-1 px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">
                {t("shell.navigate")}
              </p>
              {navResults.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={close}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-content transition-colors duration-150 hover:bg-surface-hover"
                >
                  <Icon name={item.icon} size="sm" className="text-content-tertiary" />
                  {item.label}
                  <Icon
                    name="ArrowRight"
                    size="xs"
                    className="ml-auto text-content-tertiary"
                  />
                </Link>
              ))}
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-surface-subtle px-3.5 py-2">
          <p className="text-2xs text-content-tertiary">
            {t("shell.searchesCasesPlantsMaterialsAnd")}
          </p>
          <p className="text-2xs text-content-tertiary">
            {cases.length} cases indexed
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/src/domain/types";
import { formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { AssignMenu } from "@/components/patterns/assign-menu";
import type { WorkCaseRow, WorkView } from "../types";


interface WorkToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  view: WorkView;
  onViewChange: (view: WorkView) => void;
  onExport: () => void;
  onRefresh: () => void;
  onCreate: () => void;
  isRefreshing: boolean;
  resultCount: number;
  dirtyCount: number;
  onDiscardChanges: () => void;
  selectedRows: WorkCaseRow[];
  users: User[];
  sessionUser: User;
  onBulkAssign: (userId: string) => void;
  onBulkClose: () => void;
}

/** Built per render so the labels follow the active language. */
const buildViews = (t: (key: string) => string): { key: WorkView; label: string; icon: string }[] => [
  { key: "table", label: t("work.viewTable"), icon: "Rows3" },
  { key: "board", label: t("work.viewBoard"), icon: "Columns3" },
];

/**
 * Search, view switch and the five commands: Export, Create case, Refresh,
 * Bulk assign and Bulk close. The two bulk commands stay visible at all times so
 * the capability is discoverable, and disable themselves until there is a
 * selection to act on.
 */
export const WorkToolbar = React.memo(function WorkToolbar({
  search,
  onSearchChange,
  view,
  onViewChange,
  onExport,
  onRefresh,
  onCreate,
  isRefreshing,
  resultCount,
  dirtyCount,
  onDiscardChanges,
  selectedRows,
  users,
  sessionUser,
  onBulkAssign,
  onBulkClose,
}: WorkToolbarProps) {
  const { t } = useTranslation();
  const views = React.useMemo(() => buildViews(t), [t]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const selectionCount = selectedRows.length;
  const hasSelection = selectionCount > 0;

  const summary = React.useMemo(() => {
    const plantCodes = [...new Set(selectedRows.map((row) => row.plantCode))].sort();
    return {
      plantCodes,
      openActions: selectedRows.reduce((sum, row) => sum + row.openActionCount, 0),
      alreadyClosed: selectedRows.filter((row) => !row.isOpen).length,
    };
  }, [selectedRows]);

  return (
    <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className={cn(
            "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5",
            "transition-colors duration-150 focus-within:border-accent-line xl:max-w-sm",
          )}
        >
          <Icon name="Search" size="sm" className="shrink-0 text-content-tertiary" />
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && search !== "") {
                event.stopPropagation();
                onSearchChange("");
              }
            }}
            type="search"
            aria-label={t("work.searchAria")}
            placeholder={t("work.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-xs text-content outline-none placeholder:text-content-tertiary [&::-webkit-search-cancel-button]:hidden"
          />
          {search !== "" ? (
            <button
              type="button"
              aria-label={t("work.clearSearch")}
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-sm text-content-tertiary transition-colors duration-150 hover:text-content"
            >
              <Icon name="X" size="sm" />
            </button>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label={t("work.view")}
          className="flex h-8 shrink-0 items-center rounded-md border border-line bg-surface p-0.5"
        >
          {views.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={view === entry.key}
              onClick={() => onViewChange(entry.key)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors duration-150",
                view === entry.key
                  ? "bg-surface-active text-content"
                  : "text-content-tertiary hover:text-content",
              )}
            >
              <Icon name={entry.icon} size="sm" />
              <span className="hidden sm:inline">{entry.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          disabled={resultCount === 0}
          title={
            resultCount === 0
              ? "No cases to export"
              : `Export ${resultCount} case${resultCount === 1 ? "" : "s"} to CSV`
          }
        >
          <Icon name="Download" size="sm" />
          {t("common.export")}
        </Button>

        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          <Icon
            name="RefreshCw"
            size="sm"
            className={isRefreshing ? "animate-spin" : undefined}
          />
          {isRefreshing ? t("common.refreshing") : t("common.refresh")}
        </Button>

        <span className="hidden h-5 w-px bg-line sm:block" />

        <AssignMenu
          users={users}
          sessionUser={sessionUser}
          plantCodes={summary.plantCodes}
          onAssign={onBulkAssign}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasSelection}
            title={
              hasSelection
                ? `Assign ${selectionCount} selected case${selectionCount === 1 ? "" : "s"}`
                : "Select cases to assign them"
            }
          >
            <Icon name="UserPlus" size="sm" />
            {t("workManager.bulkAssign")}
            {hasSelection ? (
              <span className="rounded-sm bg-surface-active px-1 text-2xs font-semibold tabular-nums text-content-secondary">
                {formatNumber(selectionCount)}
              </span>
            ) : null}
          </Button>
        </AssignMenu>

        <Button
          variant="secondary"
          size="sm"
          disabled={!hasSelection}
          onClick={() => setConfirmOpen(true)}
          title={
            hasSelection
              ? `Close ${selectionCount} selected case${selectionCount === 1 ? "" : "s"}`
              : "Select cases to close them"
          }
        >
          <Icon name="CheckCheck" size="sm" />
          {t("workManager.bulkClose")}
          {hasSelection ? (
            <span className="rounded-sm bg-surface-active px-1 text-2xs font-semibold tabular-nums text-content-secondary">
              {formatNumber(selectionCount)}
            </span>
          ) : null}
        </Button>

        <Button variant="primary" size="sm" onClick={onCreate}>
          <Icon name="Plus" size="sm" />
          {t("work.createCase")}
        </Button>

        {dirtyCount > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`}
              >
                <Icon name="Ellipsis" size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                {dirtyCount} change{dirtyCount === 1 ? "" : "s"} in this session
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDiscardChanges}>
                <Icon name="X" size="sm" />
                {t("work.discardChanges")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-start gap-3 px-5 pb-4 pt-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-high-line bg-high-subtle text-high">
              <Icon name="TriangleAlert" size="md" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-content">
                Close {formatNumber(selectionCount)} case
                {selectionCount === 1 ? "" : "s"}?
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-xs leading-relaxed text-content-secondary">
                Closing records the outcome against the measurement window and stops SLA
                tracking.
                {summary.openActions > 0
                  ? ` ${formatNumber(summary.openActions)} open action${
                      summary.openActions === 1 ? "" : "s"
                    } will be cancelled.`
                  : ""}
                {summary.alreadyClosed > 0
                  ? ` ${formatNumber(summary.alreadyClosed)} of the selected cases ${
                      summary.alreadyClosed === 1 ? "is" : "are"
                    } already verified or closed.`
                  : ""}
              </DialogDescription>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-line bg-surface-subtle px-5 py-3">
            <DialogClose asChild>
              <Button variant="secondary" size="md">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onBulkClose();
                setConfirmOpen(false);
              }}
            >
              <Icon name="CheckCheck" size="sm" />
              {t("work.closeCases")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

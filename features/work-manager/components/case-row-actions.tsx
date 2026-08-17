"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { roleLabel } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  CASE_STATUS_GROUPS,
  STATUS_GROUP_META,
  type CaseStatusGroup } from "@/src/domain/case-status";
import type { User } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import type { WorkCaseRow } from "../types";
import { caseHref } from "@/src/lib/routes";

interface CaseRowActionsProps {
  row: WorkCaseRow;
  users: User[];
  sessionUser: User;
  onAssign: (ids: string[], userId: string) => void;
  onMove: (ids: string[], group: CaseStatusGroup) => void;
  onClose: (ids: string[]) => void;
  onNotify: (message: string) => void;
  /** Renders the trigger inline rather than as a hover-revealed icon button. */
  variant?: "icon" | "inline";
}

/**
 * Per-row command menu. Every action here is also available in bulk from the
 * selection bar; this is the single-case path a manager uses while reading down
 * the list.
 */
export const CaseRowActions = React.memo(function CaseRowActions({
  row,
  users,
  sessionUser,
  onAssign,
  onMove,
  onClose,
  onNotify,
  variant = "icon",
}: CaseRowActionsProps) {
  const labels = useLabels();
  const { t } = useTranslation();
  const ids = React.useMemo(() => [row.id], [row.id]);

  const copyCaseNo = React.useCallback(() => {
    void navigator.clipboard
      ?.writeText(row.caseNo)
      .then(() => onNotify(`${row.caseNo} copied to the clipboard.`))
      .catch(() => onNotify(`Could not copy ${row.caseNo}.`));
  }, [row.caseNo, onNotify]);

  const owners = React.useMemo(
    () => [sessionUser, ...users.filter((user) => user.id !== sessionUser.id)],
    [users, sessionUser],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-row-interactive
          aria-label={`Actions for ${row.caseNo}`}
          className={cn(
            "flex items-center justify-center rounded-md text-content-tertiary transition-colors duration-150",
            "hover:bg-surface-active hover:text-content data-[state=open]:bg-surface-active data-[state=open]:text-content",
            variant === "icon" ? "size-7" : "h-7 w-7",
          )}
        >
          <Icon name="Ellipsis" size="sm" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel className="font-mono normal-case tracking-normal">
          {row.caseNo}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={caseHref(row.caseNo)}>
            <Icon name="ExternalLink" size="sm" />
            {t("workManager.openCase")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={copyCaseNo}>
          <Icon name="Copy" size="sm" />
          {t("workManager.copyCaseNumber")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Icon name="UserPlus" size="sm" />
            <span className="flex-1">{t("workManager.assignTo")}</span>
            <Icon name="ChevronRight" size="sm" />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {owners.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onSelect={() => onAssign(ids, user.id)}
                className="items-start py-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-content">
                    {user.name}
                    {user.id === sessionUser.id ? (
                      <span className="ml-1.5 text-2xs font-normal text-content-tertiary">
                        you
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-2xs text-content-tertiary">
                    {roleLabel(user.role, labels)}
                  </span>
                </span>
                {row.ownerId === user.id ? (
                  <Icon name="Check" size="sm" className="mt-0.5 text-accent" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Icon name="Activity" size="sm" />
            <span className="flex-1">{t("workManager.moveTo")}</span>
            <Icon name="ChevronRight" size="sm" />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {CASE_STATUS_GROUPS.map((group) => (
              <DropdownMenuItem
                key={group}
                onSelect={() => onMove(ids, group)}
                disabled={group === row.statusGroup}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    STATUS_GROUP_META[group].dotClassName,
                  )}
                />
                <span className="flex-1">{STATUS_GROUP_META[group].label}</span>
                {group === row.statusGroup ? (
                  <Icon name="Check" size="sm" className="text-accent" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => onClose(ids)}
          disabled={row.statusGroup === "CLOSED"}
        >
          <Icon name="CheckCheck" size="sm" />
          {t("workManager.closeCase")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

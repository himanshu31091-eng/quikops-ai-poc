"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { roleLabel } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "./icon";
import { OwnerAvatar } from "./owner-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User } from "@/src/domain/types";

interface AssignMenuProps {
  users: User[];
  sessionUser: User;
  /** Plant codes in the target selection — owners out of scope are flagged. */
  plantCodes: string[];
  onAssign: (userId: string) => void;
  align?: "start" | "end";
  children: React.ReactNode;
}

/**
 * Owner picker. Ordered so the manager's own name is first — self-assignment is
 * the most common action when triaging an unowned case — and every owner shows
 * whether the selected plants are inside their scope.
 */
export function AssignMenu({
  users,
  sessionUser,
  plantCodes,
  onAssign,
  align = "end",
  children,
}: AssignMenuProps) {
  const labels = useLabels();
  const { t } = useTranslation();
  // Self-assignment is always offered, even for roles that are not on the
  // routing list — a manager taking a case themselves is a legitimate outcome.
  const ordered = React.useMemo(
    () => [sessionUser, ...users.filter((user) => user.id !== sessionUser.id)],
    [users, sessionUser],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-64">
        <DropdownMenuLabel>{t("action.assignOwner")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ordered.map((user) => {
          const outOfScope = plantCodes.filter(
            (code) => !user.plantScope.includes(code),
          );
          return (
            <DropdownMenuItem
              key={user.id}
              onSelect={() => onAssign(user.id)}
              className="items-start gap-2.5 py-2"
            >
              <OwnerAvatar user={user} size="sm" showName={false} />
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
                  {roleLabel(user.role, labels)} · {user.plantScope.join(", ")}
                </span>
              </span>
              {outOfScope.length > 0 ? (
                <span
                  title={`Outside plant scope: ${outOfScope.join(", ")}`}
                  className="mt-0.5 shrink-0"
                >
                  <Icon name="TriangleAlert" size="xs" className="text-high" />
                </span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

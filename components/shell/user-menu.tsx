"use client";

import { useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/patterns/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_META } from "@/src/config/app-config";
import type { User } from "@/src/domain/types";
import { switchPersona } from "@/src/auth/session-actions";
import { initials } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

interface UserMenuProps {
  user: User;
  personas: User[];
}

/**
 * Combines the profile menu with the demo role switcher. One click moves the
 * presenter between personas without a logout cycle — the highest-leverage demo
 * affordance in the build. Compiled out of production via the persona list.
 */
export function UserMenu({ user, personas }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 items-center gap-2 rounded-md pl-1 pr-2 transition-colors duration-150 hover:bg-surface-hover",
            isPending && "opacity-60",
          )}
        >
          <Avatar className="size-6">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left lg:block">
            <span className="block text-xs font-medium leading-3.5 text-content">
              {user.name}
            </span>
            <span className="block text-2xs leading-3.5 text-content-tertiary">
              {ROLE_META[user.role].label}
            </span>
          </span>
          <Icon name="ChevronDown" size="xs" className="text-content-tertiary" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[288px]">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-content">{user.name}</p>
            <p className="truncate text-2xs text-content-tertiary">{user.email}</p>
          </div>
        </div>

        <div className="mx-2 mb-1 rounded-md border border-line bg-surface-subtle px-2 py-1.5">
          <p className="text-2xs text-content-tertiary">Job title</p>
          <p className="text-xs font-medium text-content">{user.jobTitle}</p>
          <p className="mt-1 text-2xs text-content-tertiary">
            Plant scope · {user.plantScope.join(", ")}
          </p>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Demo — present as</DropdownMenuLabel>

        {personas.map((persona) => (
          <DropdownMenuItem
            key={persona.id}
            onSelect={() =>
              startTransition(async () => {
                await switchPersona(persona.id);
              })
            }
          >
            <Icon name="UserCog" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-content">
                {persona.name}
              </span>
              <span className="block truncate text-2xs text-content-tertiary">
                {ROLE_META[persona.role].label}
              </span>
            </span>
            {persona.id === user.id ? <Icon name="Check" className="text-accent!" /> : null}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/login">
            <Icon name="LogOut" />
            Sign out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

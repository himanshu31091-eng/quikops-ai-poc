"use client";

import { Icon } from "@/components/patterns/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/i18n/provider";

/**
 * The notification bell and its dropdown.
 *
 * Presentational: the tray renders what the server resolved and does not
 * subscribe to anything. Unread count is derived from the items rather than
 * stored, so the badge cannot drift from the list beneath it.
 */
export interface NotificationModel {
  id: string;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  tone: "critical" | "high" | "success" | "info";
}

const TONE_CLASS: Record<NotificationModel["tone"], string> = {
  critical: "bg-critical",
  high: "bg-high",
  success: "bg-success",
  info: "bg-medium",
};

export function NotificationTray({ items }: { items: NotificationModel[] }) {
  const { t } = useTranslation();
  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${unreadCount} unread`}
          className="relative flex size-8 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-content"
        >
          <Icon name="Bell" size="md" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-1.5 rounded-full bg-critical ring-2 ring-surface" />
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[368px] p-0">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <p className="text-sm font-semibold text-content">{t("shell.notifications")}</p>
          <span className="rounded-sm bg-surface-hover px-1.5 py-0.5 text-2xs font-medium tabular-nums text-content-secondary">
            {unreadCount} unread
          </span>
        </div>

        <ul className="max-h-[352px] divide-y divide-line overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex gap-2.5 px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover",
                item.unread && "bg-accent-subtle/40",
              )}
            >
              <span
                className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_CLASS[item.tone])}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-content">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-content-secondary">
                  {item.body}
                </p>
                <p className="mt-1 text-2xs text-content-tertiary">
                  {formatWhen(item.at, DEMO_NOW)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-line bg-surface-subtle px-3 py-2">
          <p className="text-2xs text-content-tertiary">
            Email and Microsoft Teams delivery arrive in Phase 2
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

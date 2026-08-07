"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/patterns/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APP, NAVIGATION, type NavItem } from "@/src/config/app-config";
import type { UserRole } from "@/src/domain/types";
import { useTranslation } from "@/src/i18n/provider";
import { cn } from "@/src/lib/cn";
import { BrandMark } from "./brand-mark";

/**
 * The primary navigation.
 *
 * Sections and items come from `NAVIGATION` in `app-config`, filtered by role,
 * so a new module appears here by being registered rather than by editing this
 * file. Badge counts are passed in — the nav counts nothing itself.
 */
interface SideNavProps {
  role: UserRole;
  badges: Record<string, number>;
  onNavigate?: () => void;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({
  item,
  active,
  badgeCount,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badgeCount: number;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  // The config label is the fallback, so an untranslated key still renders the
  // English name rather than `nav.reports`. That is what lets the catalogue be
  // filled in a module at a time instead of all at once.
  const label = t(`nav.${item.key}`, {}) === `nav.${item.key}` ? item.label : t(`nav.${item.key}`);

  const row = (
    <Link
      href={item.href}
      data-tour={`nav-${item.key}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
        active
          ? "bg-accent-subtle font-medium text-accent-content"
          : "text-content-secondary hover:bg-surface-hover hover:text-content",
      )}
    >
      {active ? (
        <span className="absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
      ) : null}
      <Icon
        name={item.icon}
        size="md"
        className={active ? "text-accent" : "text-content-tertiary"}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>

      {badgeCount > 0 ? (
        <span
          className={cn(
            "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-2xs font-semibold tabular-nums",
            active
              ? "bg-accent text-white"
              : "bg-surface-active text-content-secondary group-hover:bg-line-strong",
          )}
        >
          {badgeCount}
        </span>
      ) : null}

      {item.phase === "PHASE_2" ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-line-strong"
          aria-label="Phase 2"
        />
      ) : null}
    </Link>
  );

  if (item.phase !== "PHASE_2") return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right">
        Specified for Phase 2 — navigable, not yet built
      </TooltipContent>
    </Tooltip>
  );
}

export function SideNav({ role, badges, onNavigate }: SideNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="flex h-full w-nav shrink-0 flex-col border-r border-line bg-surface"
      aria-label="Primary"
    >
      <div className="flex h-topbar shrink-0 items-center gap-2.5 border-b border-line px-4">
        <BrandMark className="size-[22px]" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-4 tracking-[-0.012em] text-content">
            {APP.name}
          </p>
          <p className="truncate text-2xs leading-3.5 text-content-tertiary">
            {APP.tagline}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {NAVIGATION.map((section, index) => {
          const items = section.items.filter((item) => item.roles.includes(role));
          if (items.length === 0) return null;

          return (
            <div key={section.key} className={cn(index > 0 && "mt-5")}>
              {section.label ? (
                <p className="mb-1.5 px-2.5 text-2xs font-semibold uppercase tracking-wider text-content-tertiary">
                  {section.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavRow
                    key={item.key}
                    item={item}
                    active={isActive(pathname, item.href)}
                    badgeCount={item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-line px-4 py-3">
        <div className="rounded-md border border-line bg-surface-subtle px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" />
            <p className="text-2xs font-medium text-content-secondary">
              Every Angle connected
            </p>
          </div>
          <p className="mt-1 text-2xs leading-4 text-content-tertiary">
            Last sync 2h ago · 34 signals
          </p>
        </div>
        <p className="mt-2.5 px-0.5 text-2xs text-content-tertiary">
          {APP.version} · {APP.environment}
        </p>
      </div>
    </nav>
  );
}

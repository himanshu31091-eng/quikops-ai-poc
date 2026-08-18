"use client";

import Link from "next/link";
import { cn } from "@/src/lib/cn";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/patterns/icon";
import { NAVIGATION } from "@/src/config/app-config";
import { useTranslation } from "@/src/i18n/provider";

/**
 * Breadcrumbs derived from the pathname.
 *
 * Derived rather than declared: a route that exists gets a trail automatically,
 * so adding a page cannot leave it stranded without one. Labels come from
 * `NAVIGATION` first, so the trail and the nav always agree on wording.
 */
interface Crumb {
  label: string;
  href: string | null;
}

const SEGMENT_LABELS: Record<string, string> = {
  system: "System",
  cases: "Cases",
  work: "Work Manager",
  "my-work": "My Work",
};

/**
 * A record identifier — a case number like `QO-PA-2026-00421`. Its hyphens are
 * part of the value, not word separators, so it must survive `toTitle` intact.
 */
// Allows the customer prefix in `QO-PA-2026-00421` as well as the older
// `QO-2026-004144`: any run of uppercase segments, ending in a numeric one.
const RECORD_ID = /^[A-Z]{2,}(?:-[A-Z0-9]+)*-\d[\d-]*$/;

function toTitle(segment: string): string {
  if (RECORD_ID.test(segment)) return segment;
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function Breadcrumbs() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const flatNav = NAVIGATION.flatMap((section) => section.items);
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: t("shell.home"), href: "/dashboard" }];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const navMatch = flatNav.find((item) => item.href === href);
    const isLast = index === segments.length - 1;
    crumbs.push({
      label: navMatch?.label ?? toTitle(segment),
      href: isLast ? null : navMatch ? href : null,
    });
  });

  const last = crumbs.length - 1;

  return (
    /*
     * Every crumb used to shrink equally, so a squeezed trail read "H. > Exe…" —
     * both ends useless. The current page is the one crumb that must stay
     * legible, so it never shrinks below a readable width while its ancestors
     * give way first, and the middle of a deep trail collapses to an ellipsis
     * rather than compressing every segment into initials.
     */
    <nav
      aria-label={t("shell.breadcrumb")}
      className="flex min-w-0 items-center gap-1 whitespace-nowrap"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === last;
        // On a deep trail the intermediate crumbs are the least valuable: the
        // root gives orientation and the leaf says where you are.
        const collapses = crumbs.length > 2 && index > 0 && index < last;

        return (
          <span
            key={`${crumb.label}-${index}`}
            className={cn(
              "flex items-center gap-1",
              isLast ? "min-w-0 shrink" : "min-w-0 shrink-3",
              collapses && "hidden xl:flex",
            )}
          >
            {index > 0 ? (
              <Icon name="ChevronRight" size="xs" className="shrink-0 text-content-tertiary" />
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="truncate text-xs text-content-tertiary transition-colors duration-150 hover:text-content"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate text-xs font-medium text-content-secondary",
                  // A leaf narrower than this is not a label, it is noise.
                  isLast && "min-w-16",
                )}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

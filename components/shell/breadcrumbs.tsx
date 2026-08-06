"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/patterns/icon";
import { NAVIGATION } from "@/src/config/app-config";

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

function toTitle(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const flatNav = NAVIGATION.flatMap((section) => section.items);
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: "Home", href: "/dashboard" }];

  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const navMatch = flatNav.find((item) => item.href === href);
    const isLast = index === segments.length - 1;
    crumbs.push({
      label: navMatch?.label ?? toTitle(segment),
      href: isLast ? null : navMatch ? href : null,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 ? (
            <Icon name="ChevronRight" size="xs" className="text-content-tertiary" />
          ) : null}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="truncate text-xs text-content-tertiary transition-colors duration-150 hover:text-content"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate text-xs font-medium text-content-secondary">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

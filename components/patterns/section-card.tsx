import * as React from "react";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Removes body padding for edge-to-edge tables. */
  flush?: boolean;
  children: React.ReactNode;
}

/**
 * The single card shell used by every dashboard panel. Structure is carried by a
 * 1px border, not a shadow — one of the strongest signals separating enterprise
 * software from consumer dashboards.
 */
export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  footer,
  className,
  bodyClassName,
  flush = false,
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span className="mt-px flex size-6 items-center justify-center rounded-md bg-surface-hover text-content-secondary">
              <Icon name={icon} size="sm" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-5 text-content">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-content-tertiary">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
      </header>

      <div className={cn("flex-1", flush ? "" : "p-4", bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="border-t border-line bg-surface-subtle px-4 py-2.5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

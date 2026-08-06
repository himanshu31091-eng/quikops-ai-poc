import * as React from "react";
import { cn } from "@/src/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.014em] text-content">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-content-secondary">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

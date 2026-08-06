import * as React from "react";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  /**
   * `md` is the page-level empty state; `sm` is the in-card variant used when
   * one section of a populated page has nothing to show.
   */
  size?: "md" | "sm";
}

const SIZE = {
  md: {
    wrapper: "px-6 py-10",
    icon: "size-9",
    iconSize: "lg" as const,
    title: "mt-3 text-base",
    description: "mt-1 max-w-xs",
    action: "mt-4",
  },
  sm: {
    wrapper: "px-6 py-8",
    icon: "size-8",
    iconSize: "md" as const,
    title: "mt-2.5 text-sm",
    description: "mt-1 max-w-sm",
    action: "mt-3",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const scale = SIZE[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        scale.wrapper,
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-lg border border-line bg-surface-subtle text-content-tertiary",
          scale.icon,
        )}
      >
        <Icon name={icon} size={scale.iconSize} />
      </span>
      <p className={cn("font-semibold text-content", scale.title)}>{title}</p>
      <p className={cn("text-xs leading-relaxed text-content-tertiary", scale.description)}>
        {description}
      </p>
      {action ? <div className={scale.action}>{action}</div> : null}
    </div>
  );
}

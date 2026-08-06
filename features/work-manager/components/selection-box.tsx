"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { cn } from "@/src/lib/cn";

interface SelectionBoxProps {
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}

/** Row and header selection control. Marked interactive so a click on it never
 *  falls through to the row's open-case handler. */
export const SelectionBox = React.memo(function SelectionBox({
  checked,
  indeterminate = false,
  onToggle,
  label,
  className,
}: SelectionBoxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      data-row-interactive
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex size-4 items-center justify-center rounded-sm border transition-colors duration-150",
        checked || indeterminate
          ? "border-accent bg-accent text-white"
          : "border-line-strong bg-surface hover:border-content-tertiary",
        className,
      )}
    >
      {indeterminate ? (
        <Icon name="Minus" size="xs" strokeWidth={3} />
      ) : checked ? (
        <Icon name="Check" size="xs" strokeWidth={3} />
      ) : null}
    </button>
  );
});

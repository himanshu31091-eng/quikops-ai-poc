import { CASE_STATUS_META, ACTION_STATUS_META } from "@/src/config/app-config";
import type { ActionStatus, CaseStatus } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";

/**
 * Case and action status, from one component.
 *
 * The two enums are separate in the domain but identical in presentation, so
 * `kind` selects the metadata table rather than the product carrying two
 * badges that must be kept looking the same by hand.
 */
interface StatusBadgeProps {
  status: CaseStatus | ActionStatus;
  kind?: "case" | "action";
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  kind = "case",
  size = "md",
  showDot = true,
  className,
}: StatusBadgeProps) {
  const meta =
    kind === "case"
      ? CASE_STATUS_META[status as CaseStatus]
      : ACTION_STATUS_META[status as ActionStatus];

  if (!meta) return null;

  return (
    <span
      className={cn(
        // The height is fixed, so the label must never wrap: a second line has
        // nowhere to go and renders outside the badge and outside its cell.
        // "Pending verification" is the label that finds every narrow column.
        "anim-status inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border font-medium",
        size === "sm" ? "h-[18px] px-1.5 text-2xs" : "h-[22px] px-2 text-xs",
        meta.className,
        className,
      )}
    >
      {showDot ? (
        <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      ) : null}
      {meta.label}
    </span>
  );
}

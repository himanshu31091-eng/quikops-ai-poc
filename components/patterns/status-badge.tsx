import { CASE_STATUS_META, ACTION_STATUS_META } from "@/src/config/app-config";
import type { ActionStatus, CaseStatus } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";

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
        "anim-status inline-flex items-center gap-1.5 rounded-sm border font-medium",
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

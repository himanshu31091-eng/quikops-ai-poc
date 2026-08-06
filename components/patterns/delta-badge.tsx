import { formatDelta } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { Icon } from "./icon";

interface DeltaBadgeProps {
  value: number;
  unit?: "pts" | "%" | "abs";
  /** When false, a rising number is a deterioration (e.g. revenue at risk). */
  higherIsBetter?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function DeltaBadge({
  value,
  unit = "pts",
  higherIsBetter = true,
  size = "md",
  className,
}: DeltaBadgeProps) {
  const isFlat = Math.abs(value) < 0.05;
  const isGood = higherIsBetter ? value > 0 : value < 0;

  const tone = isFlat
    ? "text-content-tertiary"
    : isGood
      ? "text-success"
      : "text-critical";

  const iconName = isFlat ? "Minus" : value > 0 ? "TrendingUp" : "TrendingDown";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        size === "sm" ? "text-2xs" : "text-xs",
        tone,
        className,
      )}
    >
      <Icon name={iconName} size={size === "sm" ? "xs" : "sm"} strokeWidth={2.25} />
      {isFlat ? "No change" : formatDelta(value, unit)}
    </span>
  );
}

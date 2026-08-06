import { DEFAULT_CURRENCY } from "@/src/lib/constants";
import { formatMoney } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

interface MoneyCellProps {
  amount: number;
  currency?: string;
  compact?: boolean;
  emphasis?: "default" | "strong" | "muted" | "risk";
  className?: string;
}

/** Right-aligned, tabular numerals. Never inline-formatted at the call site. */
export function MoneyCell({
  amount,
  currency = DEFAULT_CURRENCY,
  compact,
  emphasis = "default",
  className,
}: MoneyCellProps) {
  const tone = {
    default: "text-content",
    strong: "font-semibold text-content",
    muted: "text-content-secondary",
    risk: "font-semibold text-critical-content",
  }[emphasis];

  return (
    <span className={cn("tabular-nums tracking-tight", tone, className)}>
      {formatMoney(
        amount,
        currency,
        compact === undefined ? undefined : { forceCompact: compact, forceFull: !compact },
      )}
    </span>
  );
}

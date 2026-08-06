import { cn } from "@/src/lib/cn";

type ProgressTone = "accent" | "success" | "critical" | "high";

const FILL: Record<ProgressTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  critical: "bg-critical",
  high: "bg-high",
};

/** Completion rail. Announced to assistive tech, tinted by the semantic tone. */
export function ProgressBar({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-active", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", FILL[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

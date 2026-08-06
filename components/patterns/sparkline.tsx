import type { TrendPoint } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";

interface SparklineProps {
  data: TrendPoint[];
  tone?: "accent" | "critical" | "success" | "neutral";
  width?: number;
  height?: number;
  className?: string;
}

const TONE_STROKE = {
  accent: "stroke-accent",
  critical: "stroke-critical",
  success: "stroke-success",
  neutral: "stroke-content-tertiary",
} as const;

const TONE_FILL = {
  accent: "fill-accent/10",
  critical: "fill-critical/10",
  success: "fill-success/10",
  neutral: "fill-content-tertiary/10",
} as const;

/**
 * Hand-rolled SVG rather than a charting library. A sparkline needs 30 lines of
 * geometry, not 40KB of runtime, and it renders on the server with zero JS.
 */
export function Sparkline({
  data,
  tone = "accent",
  width = 104,
  height = 28,
  className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((d.value - min) / span) * (height - pad * 2);
    return { x, y };
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");

  const area = `${line} L${(width - pad).toFixed(2)},${height} L${pad},${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={area} className={cn("stroke-none", TONE_FILL[tone])} />
      <path
        d={line}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={TONE_STROKE[tone]}
      />
      {last ? (
        <circle
          cx={last.x}
          cy={last.y}
          r={2}
          className={cn(TONE_STROKE[tone], "fill-surface")}
          strokeWidth={1.5}
        />
      ) : null}
    </svg>
  );
}

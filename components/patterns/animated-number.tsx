"use client";

import * as React from "react";
import { formatMoney, formatNumber, formatPercent } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

const DURATION_MS = 700;

/**
 * Format descriptors rather than a formatter function. Functions cannot cross
 * the Server/Client Component boundary, so the intent is passed as data and the
 * formatting happens on the client.
 */
export type NumberFormat = "percent" | "currency-compact" | "currency" | "count";

const FORMATTERS: Record<NumberFormat, (value: number) => string> = {
  percent: (value) => formatPercent(value),
  "currency-compact": (value) => formatMoney(value, undefined, { forceCompact: true }),
  currency: (value) => formatMoney(value, undefined, { forceFull: true }),
  count: (value) => formatNumber(Math.round(value)),
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface AnimatedNumberProps {
  value: number;
  format: NumberFormat;
  className?: string;
  delayMs?: number;
}

/**
 * Animation #1 of the five approved: 700ms count-up, ease-out.
 * The final formatted value is rendered on the server, so there is no layout
 * shift and no flash of zero before hydration.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  delayMs = 0,
}: AnimatedNumberProps) {
  const [display, setDisplay] = React.useState(value);
  const frameRef = React.useRef<number | null>(null);
  const formatter = FORMATTERS[format];

  React.useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplay(value);
      return;
    }

    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime - delayMs;

      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / DURATION_MS, 1);
      setDisplay(value * easeOutCubic(progress));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    setDisplay(0);
    frameRef.current = requestAnimationFrame(tick);

    // Safety net: if requestAnimationFrame is throttled (background tab,
    // headless capture, heavily loaded machine) the value must still land on
    // the real number. A KPI stuck at zero mid-demo is unacceptable.
    const settle = window.setTimeout(
      () => setDisplay(value),
      delayMs + DURATION_MS + 150,
    );

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      window.clearTimeout(settle);
    };
  }, [value, delayMs]);

  return (
    <span className={cn("tabular-nums", className)} suppressHydrationWarning>
      {formatter(display)}
    </span>
  );
}

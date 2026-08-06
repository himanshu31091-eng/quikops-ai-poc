"use client";

import * as React from "react";
import { EmptyState } from "@/components/patterns/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/src/lib/cn";
import type { HeatmapGrid } from "../types";

/**
 * Both heatmaps — SLA outcome and aging — render through this one component.
 *
 * Colour comes from a single token at varying opacity rather than a gradient
 * across hues. A multi-hue scale reads as categorical and invites the question
 * "what does orange mean"; one colour getting darker reads as "more", which is
 * the only thing either grid is saying.
 */

interface AnalyticsHeatmapProps {
  grid: HeatmapGrid;
  /** The token the intensity ramp is built from. */
  tone: "critical" | "accent";
  /** Rendered inside each cell. Defaults to the raw value. */
  formatValue?: (value: number) => string;
}

const TONE_RGB: Record<AnalyticsHeatmapProps["tone"], string> = {
  // Matches --color-critical and --color-accent. Kept as channels so the ramp
  // can vary alpha without introducing a second colour token.
  critical: "225 29 72",
  accent: "29 78 216",
};

export function AnalyticsHeatmap({
  grid,
  tone,
  formatValue = (value) => String(value),
}: AnalyticsHeatmapProps) {
  const cellByKey = React.useMemo(
    () => new Map(grid.cells.map((cell) => [`${cell.rowKey}:${cell.columnKey}`, cell])),
    [grid.cells],
  );

  if (grid.rows.length === 0) {
    return (
      <EmptyState
        icon="Grid3x3"
        title="Nothing to plot"
        description={grid.emptyLabel}
        size="sm"
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-105 border-separate border-spacing-1">
          <thead>
            <tr>
              <th scope="col" className="w-32 px-1 py-1 text-left text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                Plant
              </th>
              {grid.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-1 py-1 text-center text-2xs font-semibold uppercase tracking-wide text-content-tertiary"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="max-w-32 truncate px-1 py-1 text-left text-xs font-medium text-content"
                >
                  {row.label}
                </th>
                {grid.columns.map((column) => {
                  const cell = cellByKey.get(`${row.key}:${column.key}`);
                  const intensity = cell?.intensity ?? 0;
                  const value = cell?.value ?? 0;
                  // Floor the alpha so an occupied-but-zero cell still reads as
                  // a cell rather than a hole in the grid.
                  const alpha = value === 0 ? 0.04 : 0.14 + intensity * 0.72;

                  return (
                    <td key={column.key} className="p-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex h-11 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors duration-150",
                              value === 0
                                ? "border-line text-content-tertiary"
                                : "border-transparent",
                              intensity > 0.55 ? "text-white" : "text-content",
                            )}
                            style={{
                              backgroundColor: `rgb(${TONE_RGB[tone]} / ${alpha})`,
                            }}
                          >
                            {value === 0 ? "–" : formatValue(value)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-medium">
                            {row.label} · {column.label}
                          </p>
                          <p className="mt-0.5 text-2xs opacity-80">
                            {cell?.detail ?? grid.emptyLabel}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-2xs text-content-tertiary">{grid.scaleLabel}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-2xs text-content-tertiary">Low</span>
          {[0.08, 0.3, 0.52, 0.74, 0.94].map((alpha) => (
            <span
              key={alpha}
              className="size-3 rounded-sm"
              style={{ backgroundColor: `rgb(${TONE_RGB[tone]} / ${alpha})` }}
            />
          ))}
          <span className="text-2xs text-content-tertiary">High</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/src/lib/format";
import type { WorkCaseRow } from "../types";

interface SelectionSummaryProps {
  selectedRows: WorkCaseRow[];
  onClear: () => void;
}

/**
 * What is currently selected, in the terms a bulk action will be judged by:
 * how many cases, which plants, how much exposure and how much open work sits
 * underneath them. The actions themselves live in the toolbar.
 */
export const SelectionSummary = React.memo(function SelectionSummary({
  selectedRows,
  onClear,
}: SelectionSummaryProps) {
  const summary = React.useMemo(() => {
    const plantCodes = [...new Set(selectedRows.map((row) => row.plantCode))].sort();
    return {
      plantCodes,
      revenue: selectedRows.reduce((sum, row) => sum + row.revenueAtRisk, 0),
      openActions: selectedRows.reduce((sum, row) => sum + row.openActionCount, 0),
      unassigned: selectedRows.filter((row) => row.ownerId === null).length,
    };
  }, [selectedRows]);

  if (selectedRows.length === 0) return null;

  return (
    <div
      role="status"
      className="anim-settle flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-accent-line bg-accent-subtle px-3 py-2"
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-accent-content">
        <span className="flex size-5 items-center justify-center rounded-sm bg-accent text-white">
          <Icon name="Check" size="xs" strokeWidth={3} />
        </span>
        {formatNumber(selectedRows.length)} selected
      </span>

      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-content-secondary">
        <span className="font-mono">{summary.plantCodes.join(", ")}</span>
        <span className="text-content-tertiary">·</span>
        <MoneyCell amount={summary.revenue} compact={false} className="text-2xs" />
        <span className="text-content-tertiary">at risk</span>
        {summary.openActions > 0 ? (
          <>
            <span className="text-content-tertiary">·</span>
            <span>{formatNumber(summary.openActions)} open actions</span>
          </>
        ) : null}
        {summary.unassigned > 0 ? (
          <>
            <span className="text-content-tertiary">·</span>
            <span className="font-medium text-high-content">
              {formatNumber(summary.unassigned)} unassigned
            </span>
          </>
        ) : null}
      </span>

      <span className="ml-auto flex items-center gap-1.5 text-2xs text-content-tertiary">
        <span className="hidden sm:inline">Use Bulk assign or Bulk close in the toolbar</span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Icon name="X" size="sm" />
          Clear
        </Button>
      </span>
    </div>
  );
});

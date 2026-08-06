"use client";

import { Icon } from "@/components/patterns/icon";
import { FLOW_HORIZONS, type FlowHorizon, type FlowUnit } from "@/src/domain/flow-balance";
import { cn } from "@/src/lib/cn";

/**
 * The two controls the whole flow region reads from.
 *
 * A horizon and a unit, and nothing else. Both are segmented rather than
 * dropdowns because there are three options and two: a menu that hides three
 * choices behind a click costs more than it saves, and the current selection
 * being legible without opening anything is the point.
 *
 * The unit toggle is the more important of the two. Every figure in the product
 * has been a count until now, and a count of cases is not what an executive is
 * accountable for — the exposure behind them is.
 */

const SEGMENT_BASE =
  "relative h-7 rounded-sm px-2.5 text-2xs font-medium transition-colors duration-150";

function Segment({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        SEGMENT_BASE,
        active
          ? "bg-surface text-content shadow-raised"
          : "text-content-tertiary hover:text-content-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function FlowControls({
  horizon,
  unit,
  onHorizonChange,
  onUnitChange,
}: {
  horizon: FlowHorizon;
  unit: FlowUnit;
  onHorizonChange: (horizon: FlowHorizon) => void;
  onUnitChange: (unit: FlowUnit) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div
        role="group"
        aria-label="Time horizon"
        className="flex items-center gap-0.5 rounded-md border border-line bg-surface-hover p-0.5"
      >
        {FLOW_HORIZONS.map((entry) => (
          <Segment
            key={entry.key}
            active={horizon === entry.key}
            onClick={() => onHorizonChange(entry.key)}
            label={`Show ${entry.label}`}
          >
            {entry.label}
          </Segment>
        ))}
      </div>

      <div
        role="group"
        aria-label="Unit of measure"
        className="flex items-center gap-0.5 rounded-md border border-line bg-surface-hover p-0.5"
      >
        <Segment
          active={unit === "count"}
          onClick={() => onUnitChange("count")}
          label="Measure in case count"
        >
          <span className="flex items-center gap-1">
            <Icon name="Rows3" size="xs" />
            Cases
          </span>
        </Segment>
        <Segment
          active={unit === "value"}
          onClick={() => onUnitChange("value")}
          label="Measure in revenue exposure"
        >
          <span className="flex items-center gap-1">
            <Icon name="DollarSign" size="xs" />
            Exposure
          </span>
        </Segment>
      </div>
    </div>
  );
}

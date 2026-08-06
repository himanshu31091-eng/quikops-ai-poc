"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import type { CaseListItem, Plant } from "@/src/domain/types";
import { useFlow } from "../hooks/use-flow";
import { ExecutiveBriefing } from "./executive-briefing";
import { BacklogTrajectory, ForecastVerdict, NetFlowRibbon } from "./flow-charts";
import { FlowControls } from "./flow-controls";
import { BandMixture, FlowDrilldown } from "./flow-drilldown";
import { FlowLedgerStrip } from "./flow-ledger-strip";

/**
 * The flow region — everything that answers *is this getting better*.
 *
 * Composed as one block rather than scattered through the page because the
 * horizon and unit controls apply to all of it, and a control whose scope is
 * ambiguous is worse than no control. The boundary is drawn explicitly at the
 * top: everything below the strip reads from those two selections, and nothing
 * above it does.
 *
 * The order is the order it should be read in — the balance, then the verdict,
 * then where the verdict came from, then what to do about it — which is the
 * inverse of how most analytics pages are built and the reason this one can be
 * skimmed in ten seconds.
 */
export function FlowSection({
  cases,
  plants,
  onAskCopilot,
}: {
  cases: CaseListItem[];
  plants: Plant[];
  onAskCopilot?: () => void;
}) {
  const flow = useFlow(cases, plants);
  const currency = cases[0]?.currency ?? "USD";

  return (
    <section aria-label="Flow balance and forecast" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-content">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent-subtle text-accent-content">
              <Icon name="Activity" size="sm" />
            </span>
            Flow &amp; forecast
          </h2>
          <p className="mt-0.5 text-2xs text-content-secondary">
            Detection against resolution — whether the operation is gaining on its
            backlog, and when it clears at the current rate.
          </p>
        </div>
        <FlowControls
          horizon={flow.horizon}
          unit={flow.unit}
          onHorizonChange={flow.setHorizon}
          onUnitChange={flow.setUnit}
        />
      </div>

      <SectionCard
        title="The balance"
        subtitle={`Open at the start of the window, what arrived, what left, and where it stands now`}
        icon="Gauge"
      >
        <FlowLedgerStrip ledger={flow.ledger} unit={flow.unit} currency={currency} />
      </SectionCard>

      <ExecutiveBriefing
        narrative={flow.narrative}
        recommendations={flow.recommendations}
        ledger={flow.ledger}
        comparison={flow.comparison}
        {...(onAskCopilot ? { onAskCopilot } : {})}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            title="Detection against resolution"
            subtitle="Above the line arrived; below it was cleared"
            icon="ChartNoAxesColumn"
            className="h-full"
          >
            <NetFlowRibbon ledger={flow.ledger} unit={flow.unit} currency={currency} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            title="Backlog trajectory"
            subtitle="Measured, then extrapolated at the current rate"
            icon="TrendingDown"
            className="h-full"
            footer={<ForecastVerdict ledger={flow.ledger} forecast={flow.forecast} />}
          >
            <BacklogTrajectory
              ledger={flow.ledger}
              forecast={flow.forecast}
              unit={flow.unit}
              currency={currency}
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            title="Where the net came from"
            subtitle="Select a row to open it without losing the comparison"
            icon="Layers"
            className="h-full"
          >
            <FlowDrilldown
              slices={flow.slices}
              dimension={flow.dimension}
              unit={flow.unit}
              currency={currency}
              selectedKey={flow.selectedKey}
              onDimensionChange={flow.setDimension}
              onSelect={flow.selectSlice}
            />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            title="Band mixture"
            subtitle="A steady total can still be a worsening portfolio"
            icon="Target"
            className="h-full"
          >
            <BandMixture bands={flow.bands} currency={currency} />
          </SectionCard>
        </div>
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import type { CaseListItem, Plant } from "@/src/domain/types";
import { DEMO_NOW, DEFAULT_CURRENCY } from "@/src/lib/constants";
import {
  ageProfile,
  customerPerformance,
  escalationAnalytics,
} from "@/src/domain/segment-performance";
import { useFlow } from "../hooks/use-flow";
import { ExecutiveBriefing } from "./executive-briefing";
import { BacklogTrajectory, ForecastVerdict, NetFlowRibbon } from "./flow-charts";
import { FlowControls } from "./flow-controls";
import { BandMixture, FlowDrilldown } from "./flow-drilldown";
import { FlowLedgerStrip } from "./flow-ledger-strip";
import {
  AgeProfilePanel,
  CustomerExposurePanel,
  EscalationPanel,
} from "./segment-panels";

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
  const { t } = useTranslation();
  const flow = useFlow(cases, plants);
  const currency = cases[0]?.currency ?? DEFAULT_CURRENCY;

  // Commercial and escalation cuts of the same corpus. Independent of the flow
  // horizon: these describe the position now, not movement over a window, and a
  // horizon control over a snapshot would imply a relationship that is not there.
  const customers = React.useMemo(() => customerPerformance(cases, DEMO_NOW), [cases]);
  const escalations = React.useMemo(() => escalationAnalytics(cases, DEMO_NOW), [cases]);
  const ages = React.useMemo(() => ageProfile(cases, DEMO_NOW), [cases]);

  return (
    <section
      aria-label={t("analytics.flowBalanceAndForecast")}
      data-tour="analytics-flow"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-content">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent-subtle text-accent-content">
              <Icon name="Activity" size="sm" />
            </span>
            {t("analytics.flowAmpForecast")}
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
        title={t("analytics.theBalance")}
        subtitle={`Open at the start of the window, what arrived, what left, and where it stands now`}
        icon="Gauge"
      >
        <FlowLedgerStrip ledger={flow.ledger} unit={flow.unit} currency={currency} />
      </SectionCard>

      <div data-tour="analytics-briefing">
        <ExecutiveBriefing
          narrative={flow.narrative}
          recommendations={flow.recommendations}
          ledger={flow.ledger}
          comparison={flow.comparison}
          {...(onAskCopilot ? { onAskCopilot } : {})}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            title={t("analytics.detectionAgainstResolution")}
            subtitle={t("analytics.aboveTheLineArrivedBelow")}
            icon="ChartNoAxesColumn"
            className="h-full"
          >
            <NetFlowRibbon ledger={flow.ledger} unit={flow.unit} currency={currency} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            title={t("analytics.backlogTrajectory")}
            subtitle={t("analytics.measuredThenExtrapolatedAtThe")}
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
            title={t("analytics.whereTheNetCameFrom")}
            subtitle={t("analytics.selectARowToOpen")}
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
            title={t("analytics.bandMixture")}
            subtitle={t("analytics.aSteadyTotalCanStill")}
            icon="Target"
            className="h-full"
          >
            <BandMixture bands={flow.bands} currency={currency} />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <SectionCard
            title={t("analytics.customerExposure")}
            subtitle={t("analytics.whichAccountsAreActuallyCarrying")}
            icon="Users"
            className="h-full"
          >
            <CustomerExposurePanel data={customers} currency={currency} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-5">
          <SectionCard
            title={t("analytics.daysInTrouble")}
            subtitle={t("analytics.howLongOpenWorkHas")}
            icon="Clock"
            className="h-full"
          >
            <AgeProfilePanel bands={ages} currency={currency} />
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title={t("analytics.escalationDepth")}
        subtitle={t("analytics.workThatHasBeenPushed")}
        icon="TrendingUp"
      >
        <EscalationPanel data={escalations} currency={currency} />
      </SectionCard>
    </section>
  );
}

"use client";

import * as React from "react";
import { ActionToast } from "@/components/patterns/action-toast";
import { Icon } from "@/components/patterns/icon";
import { PageHeader } from "@/components/patterns/page-header";
import { FirstUseTip } from "@/components/patterns/in-app-tip";
import { SectionCard } from "@/components/patterns/section-card";
import type { AnalyticsData } from "@/src/data/queries/analytics";
import { DEMO_NOW, OTIF_TARGET_PCT } from "@/src/lib/constants";
import { formatTimestamp } from "@/src/lib/format";
import { useAnalytics } from "../hooks/use-analytics";
import { AnalyticsFilterBar } from "./analytics-filter-bar";
import { AnalyticsHeatmap } from "./analytics-heatmap";
import { AnalyticsKpiCards } from "./analytics-kpi-cards";
import {
  CategoryBreakdownChart,
  TrendChart,
  WeeklyThroughputChart,
} from "./analytics-charts";
import { PersonPerformanceTable, PlantPerformanceTable } from "./performance-table";
import { FlowSection } from "./flow-section";

/**
 * Module root. Owns composition and nothing else: the state lives in
 * useAnalytics, the presentation lives in the panels, and this file is the
 * wiring plus the grid.
 *
 * Every section is a SectionCard so the page reads as one surface with the
 * Executive Dashboard rather than a second design.
 */

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
      <Icon name={icon} size="xs" />
      {children}
    </span>
  );
}

const FILTERED_NOTE = "Reflects the current filter selection.";

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const api = useAnalytics(data);
  const { model, filters, facets } = api;

  const scopeNote = model.isFiltered ? FILTERED_NOTE : "Across the full portfolio.";

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="analytics"
        title="Execution Analytics"
        description="How the operation is performing at closing the exceptions it detects — by plant, by owner and over time."
        meta={
          <>
            <MetaChip icon="Clock">Data as at {formatTimestamp(DEMO_NOW)} UTC</MetaChip>
            <MetaChip icon="Filter">{api.scopeLabel}</MetaChip>
            <MetaChip icon="Rows3">
              {model.cases.length} of {data.cases.length} cases
            </MetaChip>
          </>
        }
      />

      <FirstUseTip screen="analytics" />

      <AnalyticsFilterBar
        filters={filters}
        facets={facets}
        ranges={api.ranges}
        isFiltered={model.isFiltered}
        caseCount={model.cases.length}
        onToggle={api.toggleFilterValue}
        onClear={api.clearFilterField}
        onSetRange={api.setRange}
        onClearAll={api.clearFilters}
        onExportCsv={api.exportCsv}
        onExportPdf={api.exportPdf}
      />

      {api.notice ? (
        <ActionToast
          message={api.notice}
          tone="success"
          placement="floating"
          onDismiss={api.dismissNotice}
        />
      ) : null}

      {/* 1 — Headline trend cards */}
      <section aria-label="Headline metrics">
        <AnalyticsKpiCards kpis={model.kpis} />
      </section>

      {/* 1b — Flow: the only region with its own horizon and unit, and the
          only one that reads the whole corpus rather than the page filters. */}
      <FlowSection cases={api.allCases} plants={data.plants} />

      {/* 2 — Trends */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title="On-time in full"
            subtitle="Group level, against the 95% target"
            icon="ChartNoAxesColumn"
            className="h-full"
            footer={
              <p className="text-2xs text-content-tertiary">
                Read from connected operational data over the selected window and never
                recomputed here.
              </p>
            }
          >
            <TrendChart
              data={model.otifSeries}
              unit="percent"
              label="On-time in full"
              target={{ value: OTIF_TARGET_PCT, label: "Target 95%" }}
              emptyMessage="No OTIF readings in the selected window."
              footnote="Source: Connected Enterprise Data · daily refresh"
            />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title="Revenue at risk"
            subtitle="Open exposure over time"
            icon="DollarSign"
            className="h-full"
          >
            <TrendChart
              data={model.revenueSeries}
              unit="currency"
              label="Revenue at risk"
              colorVar="var(--color-chart-4)"
              emptyMessage="No exposure readings in the selected window."
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-6">
          <SectionCard
            title="Resolution time"
            subtitle="Mean hours from detection to verification, by week"
            icon="Clock"
            className="h-full"
            footer={
              <p className="text-2xs text-content-tertiary">
                Derived from the cases in scope, so weeks with no resolved case are omitted
                rather than drawn as zero.
              </p>
            }
          >
            <TrendChart
              data={model.resolutionSeries}
              unit="hours"
              label="Mean time to resolve"
              colorVar="var(--color-chart-5)"
              emptyMessage="No cases were resolved in the selected window."
            />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-6">
          <SectionCard
            title="Cases opened and closed"
            subtitle="Weekly throughput — is the backlog clearing?"
            icon="Activity"
            className="h-full"
          >
            <WeeklyThroughputChart
              data={model.weekly}
              emptyMessage="No case activity in the selected window."
            />
          </SectionCard>
        </div>
      </div>

      {/* 3 — Distribution */}
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Cases by priority" subtitle="Scored by the rule set" icon="Target">
          <CategoryBreakdownChart
            data={model.byPriority}
            emptyMessage="No cases match the current filters."
          />
        </SectionCard>
        <SectionCard title="Cases by plant" subtitle="Where the work sits" icon="Factory">
          <CategoryBreakdownChart
            data={model.byPlant}
            emptyMessage="No cases match the current filters."
          />
        </SectionCard>
        <SectionCard
          title="Cases by exception type"
          subtitle="What keeps going wrong"
          icon="OctagonAlert"
        >
          <CategoryBreakdownChart
            data={model.byException}
            emptyMessage="No cases match the current filters."
          />
        </SectionCard>
      </div>

      {/* 4 — Plant performance */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Top performing plants"
          subtitle="Ranked on SLA adherence, penalised for open breaches"
          icon="TrendingUp"
          flush
          className="h-full"
        >
          <PlantPerformanceTable rows={model.topPlants} emptyMessage={scopeNote} />
        </SectionCard>
        <SectionCard
          title="Lowest performing plants"
          subtitle="Worst first — these are the ones to act on"
          icon="TrendingDown"
          flush
          className="h-full"
        >
          <PlantPerformanceTable rows={model.bottomPlants} emptyMessage={scopeNote} />
        </SectionCard>
      </div>

      {/* 5 — People */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Owner performance"
          subtitle="Execution against the cases each person owns"
          icon="UserCog"
          flush
          className="h-full"
        >
          <PersonPerformanceTable
            rows={model.owners}
            people={data.people}
            loadLabel="Owned"
            emptyMessage="No cases in this selection carry an owner."
          />
        </SectionCard>
        <SectionCard
          title="Reviewer performance"
          subtitle="Verification load and turnaround"
          icon="ShieldCheck"
          flush
          className="h-full"
          footer={
            <p className="text-2xs text-content-tertiary">
              Counts only cases that have reached verification — a reviewer does not carry a
              case until it is submitted to them.
            </p>
          }
        >
          <PersonPerformanceTable
            rows={model.reviewers}
            people={data.people}
            loadLabel="Reviewed"
            emptyMessage="Nothing in this selection has reached verification yet."
          />
        </SectionCard>
      </div>

      {/* 6 — Heatmaps */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="SLA heatmap"
          subtitle="Open cases past target, by plant and priority"
          icon="Grid3x3"
          className="h-full"
        >
          <AnalyticsHeatmap grid={model.slaHeatmap} tone="critical" />
        </SectionCard>
        <SectionCard
          title="Aging heatmap"
          subtitle="How long open work has been sitting, by plant"
          icon="Hourglass"
          className="h-full"
        >
          <AnalyticsHeatmap grid={model.agingHeatmap} tone="accent" />
        </SectionCard>
      </div>
    </div>
  );
}

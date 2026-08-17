"use client";

import * as React from "react";
import { ActionToast } from "@/components/patterns/action-toast";
import { Icon } from "@/components/patterns/icon";
import { PageHeader } from "@/components/patterns/page-header";
import { useFormat, useTranslation } from "@/src/i18n/provider";
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
  const fmt = useFormat();
  const { t } = useTranslation();
  const api = useAnalytics(data);
  const { model, filters, facets } = api;

  const scopeNote = model.isFiltered ? FILTERED_NOTE : "Across the full portfolio.";

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="analytics"
        title={t("page.analytics.title")}
        description={t("page.analytics.description")}
        meta={
          <>
            <MetaChip icon="Clock">{t("shell.dataAsAt", { when: formatTimestamp(DEMO_NOW, fmt) })}</MetaChip>
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
      <section aria-label={t("an.headlineMetrics")}>
        <AnalyticsKpiCards kpis={model.kpis} />
      </section>

      {/* 1b — Flow: the only region with its own horizon and unit, and the
          only one that reads the whole corpus rather than the page filters. */}
      <FlowSection cases={api.allCases} plants={data.plants} />

      {/* 2 — Trends */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title={t("kpi.otif")}
            subtitle={t("analytics.groupTarget")}
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
              label={t("kpi.otif")}
              target={{ value: OTIF_TARGET_PCT, label: t("kpi.target95") }}
              emptyMessage={t("an.noOtif")}
              footnote="Source: Connected Enterprise Data · daily refresh"
            />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title={t("kpi.revenueAtRisk")}
            subtitle={t("analytics.exposure")}
            icon="DollarSign"
            className="h-full"
          >
            <TrendChart
              data={model.revenueSeries}
              unit="currency"
              label={t("kpi.revenueAtRisk")}
              colorVar="var(--color-chart-4)"
              emptyMessage={t("an.noExposure")}
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-6">
          <SectionCard
            title={t("an.resolutionTime")}
            subtitle={t("analytics.mttrWeekly")}
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
              label={t("metric.mttr")}
              colorVar="var(--color-chart-5)"
              emptyMessage={t("an.noResolved")}
            />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-6">
          <SectionCard
            title={t("an.openedClosed")}
            subtitle={t("analytics.throughput")}
            icon="Activity"
            className="h-full"
          >
            <WeeklyThroughputChart
              data={model.weekly}
              emptyMessage={t("an.noActivity")}
            />
          </SectionCard>
        </div>
      </div>

      {/* 3 — Distribution */}
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title={t("an.byPriority")} subtitle={t("analytics.scored")} icon="Target">
          <CategoryBreakdownChart
            data={model.byPriority}
            emptyMessage={t("an.noMatch")}
          />
        </SectionCard>
        <SectionCard title={t("an.byPlant")} subtitle={t("analytics.whereWorkSits")} icon="Factory">
          <CategoryBreakdownChart
            data={model.byPlant}
            emptyMessage={t("an.noMatch")}
          />
        </SectionCard>
        <SectionCard
          title={t("an.byException")}
          subtitle={t("analytics.recurring")}
          icon="OctagonAlert"
        >
          <CategoryBreakdownChart
            data={model.byException}
            emptyMessage={t("an.noMatch")}
          />
        </SectionCard>
      </div>

      {/* 4 — Plant performance */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={t("an.topPlants")}
          subtitle={t("analytics.plantRanking")}
          icon="TrendingUp"
          flush
          className="h-full"
        >
          <PlantPerformanceTable rows={model.topPlants} emptyMessage={scopeNote} />
        </SectionCard>
        <SectionCard
          title={t("an.lowestPlants")}
          subtitle={t("an.worstFirst")}
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
          title={t("an.ownerPerformance")}
          subtitle={t("analytics.byOwner")}
          icon="UserCog"
          flush
          className="h-full"
        >
          <PersonPerformanceTable
            rows={model.owners}
            people={data.people}
            loadLabel="Owned"
            emptyMessage={t("an.noOwner")}
          />
        </SectionCard>
        <SectionCard
          title={t("an.reviewerPerformance")}
          subtitle={t("analytics.verificationLoad")}
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
            emptyMessage={t("an.noVerification")}
          />
        </SectionCard>
      </div>

      {/* 6 — Heatmaps */}
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={t("an.slaHeatmap")}
          subtitle={t("analytics.breaches")}
          icon="Grid3x3"
          className="h-full"
        >
          <AnalyticsHeatmap grid={model.slaHeatmap} tone="critical" />
        </SectionCard>
        <SectionCard
          title={t("an.agingHeatmap")}
          subtitle={t("analytics.ageing")}
          icon="Hourglass"
          className="h-full"
        >
          <AnalyticsHeatmap grid={model.agingHeatmap} tone="accent" />
        </SectionCard>
      </div>
    </div>
  );
}

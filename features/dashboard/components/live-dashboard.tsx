"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import type {
  ActivityEvent,
  CaseListItem,
  ExecutionMetrics,
  KpiCardModel,
  PlantHealth,
  RevenueImpactBucket,
} from "@/src/domain/types";
import {
  buildExecutiveNarrative,
  buildFlowLedger,
  compareFlowWindows,
  forecastFlow,
} from "@/src/domain/flow-balance";
import { cn } from "@/src/lib/cn";
import { DEMO_NOW, DEFAULT_CURRENCY } from "@/src/lib/constants";
import { buildCsv, exportSectionsCsv } from "@/src/lib/export";
import { formatMoney } from "@/src/lib/format";
import { useExecutionStore } from "@/src/workflow/execution-store";
import {
  projectActivity,
  projectCaseFacts,
  projectExecutionMetrics,
  projectKpis,
  projectRevenueImpact,
  revenueMovement,
} from "@/src/workflow/projections";
import { ActivityFeed } from "./activity-feed";
import { ExecutionMetricsStrip } from "./execution-metrics-strip";
import { KpiCard } from "./kpi-card";
import { RevenueImpactChart } from "./revenue-impact-chart";

/**
 * The dashboard's reactive shell.
 *
 * The page stays a server component — it renders the real numbers on the
 * server, and these wrappers re-derive them against whatever work has been done
 * in this session. With an empty store every projection returns its input
 * unchanged, so the first paint is exactly the server response and there is no
 * flash of adjusted figures.
 *
 * Wrappers rather than edits: the KPI card, activity feed and revenue chart are
 * untouched and still take plain data.
 */

export function LiveKpiBand({
  kpis,
  cases,
}: {
  kpis: KpiCardModel[];
  cases: CaseListItem[];
}) {
  const { state } = useExecutionStore();

  const projected = React.useMemo(
    () => projectKpis(kpis, cases, projectCaseFacts(cases, state), state),
    [kpis, cases, state],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {projected.map((model, index) => (
        <KpiCard key={model.key} model={model} index={index} />
      ))}
    </div>
  );
}

export function LiveExecutionMetrics({
  metrics,
  cases,
}: {
  metrics: ExecutionMetrics;
  cases: CaseListItem[];
}) {
  const { state } = useExecutionStore();
  const projected = React.useMemo(
    () => projectExecutionMetrics(metrics, cases, state),
    [metrics, cases, state],
  );

  return <ExecutionMetricsStrip metrics={projected} />;
}

export function LiveActivityFeed({
  events,
  limit = 7,
}: {
  events: ActivityEvent[];
  limit?: number;
}) {
  const { state } = useExecutionStore();
  const projected = React.useMemo(
    () => projectActivity(events, state, limit),
    [events, state, limit],
  );

  return <ActivityFeed events={projected} />;
}

export function LiveRevenueImpact({
  buckets,
  cases,
}: {
  buckets: RevenueImpactBucket[];
  cases: CaseListItem[];
}) {
  const { state } = useExecutionStore();
  const projected = React.useMemo(
    () => projectRevenueImpact(buckets, cases, state),
    [buckets, cases, state],
  );

  return <RevenueImpactChart data={projected} />;
}

/**
 * Says plainly that the headline numbers include work done in this browser
 * session and not yet written to the store. Renders nothing until there is
 * something to disclose.
 */
export function LiveSessionChip({ cases }: { cases: CaseListItem[] }) {
  const { state, isDirty } = useExecutionStore();
  const movement = React.useMemo(() => revenueMovement(cases, state), [cases, state]);

  if (!isDirty) return null;

  const changed = Object.keys(state.overrides).length;

  return (
    <span className="flex items-center gap-1.5 text-2xs font-medium text-success-content">
      <Icon name="Activity" size="xs" />
      Live session · {changed} case{changed === 1 ? "" : "s"} updated
      {movement.recovered > 0 ? ` · ${formatMoney(movement.recovered)} recovered` : ""}
    </span>
  );
}

/**
 * The flow verdict, on the screen the demo opens with.
 *
 * A wrapper, not a redesign: the dashboard stays a server component and this
 * adds one band to it, reading the same execution store as the KPI cards above
 * so the verdict cannot contradict them. The heavy version — charts, drill-down,
 * band mixture, horizon and unit controls — lives in Execution Analytics; this
 * is the one sentence and the one number a director needs before deciding
 * whether to go there.
 *
 * Fixed at the four-week horizon — the same one the Analytics flow region
 * opens at. A control here would be a second place to set something Analytics
 * already owns, and the two would disagree; matching the default means the
 * sentence here and the sentence there quote the same rate.
 */
export function LiveFlowVerdict({ cases }: { cases: CaseListItem[] }) {
  const { t } = useTranslation();
  const { state } = useExecutionStore();

  const { ledger, forecast, narrative } = React.useMemo(() => {
    const projected = projectCaseFacts(cases, state);
    const built = buildFlowLedger(projected, DEMO_NOW, "month");
    const forecasted = forecastFlow(built, DEMO_NOW);
    const comparison = compareFlowWindows(projected, DEMO_NOW, "month");
    return {
      ledger: built,
      forecast: forecasted,
      narrative: buildExecutiveNarrative(
        built,
        forecasted,
        comparison,
        null,
        (amount) =>
          formatMoney(amount, projected[0]?.currency ?? DEFAULT_CURRENCY, { forceCompact: true }),
      ),
    };
  }, [cases, state]);

  const clearing = forecast.direction === "clearing";
  const growing = forecast.direction === "growing";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5",
        clearing
          ? "border-success-line bg-success-subtle"
          : growing
            ? "border-critical-line bg-critical-subtle"
            : "border-line bg-surface",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          clearing
            ? "bg-success text-white"
            : growing
              ? "bg-critical text-white"
              : "bg-surface-hover text-content-secondary",
        )}
        aria-hidden
      >
        <Icon
          name={clearing ? "TrendingDown" : growing ? "TrendingUp" : "Minus"}
          size="lg"
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-content">
          {narrative.headline}
        </span>
        <span className="mt-0.5 block text-2xs leading-relaxed text-content-secondary">
          {ledger.detected} detected · {ledger.resolved} resolved · open balance{" "}
          {ledger.opening} → {ledger.closing} over {ledger.horizon.days} days
          {forecast.bucketsToClear === null
            ? ""
            : ` · clears in about ${forecast.bucketsToClear} week${forecast.bucketsToClear === 1 ? "" : "s"} at this rate`}
        </span>
      </span>

      <Button variant="secondary" size="sm" asChild className="shrink-0 print:hidden">
        <Link href="/analytics">
          {t("dashboard.seeTheFlow")}
          <Icon name="ArrowRight" size="sm" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * Exports the dashboard's figures, projected through this session's work.
 *
 * A wrapper for the same reason as the others: the page is a server component
 * and the export has to reflect what is actually on screen, which means reading
 * the execution store. Exporting the server's numbers while the screen shows
 * session-adjusted ones is how an export stops being trusted.
 */
export function DashboardExportButton({
  kpis,
  metrics,
  plantHealth,
  cases,
}: {
  kpis: KpiCardModel[];
  metrics: ExecutionMetrics;
  plantHealth: PlantHealth[];
  cases: CaseListItem[];
}) {
  const { t } = useTranslation();
  const { state } = useExecutionStore();

  const onExport = React.useCallback(() => {
    const liveKpis = projectKpis(kpis, cases, projectCaseFacts(cases, state), state);
    const liveMetrics = projectExecutionMetrics(metrics, cases, state);

    exportSectionsCsv("executive-dashboard", "Executive Dashboard", [
      {
        title: t("dash.headlineIndicators"),
        csv: buildCsv(liveKpis, [
          { header: "Indicator", value: (row) => row.label },
          { header: "Value", value: (row) => String(row.value) },
          { header: "Unit", value: (row) => row.unit },
          { header: "Target", value: (row) => (row.target === null ? "" : String(row.target)) },
          { header: "Change", value: (row) => `${row.deltaValue} ${row.deltaUnit}` },
        ]),
      },
      {
        title: t("dash.executionPerformance"),
        csv: buildCsv(
          [
            { measure: "Mean time to resolve (hours)", value: liveMetrics.mttrHours },
            { measure: "SLA adherence (%)", value: liveMetrics.slaAdherencePct },
            { measure: "Verification pass rate (%)", value: liveMetrics.verificationPassRatePct },
            { measure: "Recurrence rate (%)", value: liveMetrics.recurrenceRatePct },
            { measure: "Cases closed this week", value: liveMetrics.casesClosedThisWeek },
            { measure: "Cases opened this week", value: liveMetrics.casesOpenedThisWeek },
          ],
          [
            { header: "Measure", value: (row) => row.measure },
            { header: "Value", value: (row) => String(row.value) },
          ],
        ),
      },
      {
        title: t("dashboard.plantHealth"),
        csv: buildCsv(plantHealth, [
          { header: "Plant", value: (row) => row.plant.code },
          { header: "Name", value: (row) => row.plant.name },
          { header: "OTIF %", value: (row) => String(row.otifPct) },
          { header: "Open cases", value: (row) => String(row.openCases) },
          { header: "Critical cases", value: (row) => String(row.criticalCases) },
          { header: "Revenue at risk", value: (row) => String(row.revenueAtRisk) },
          { header: "SLA adherence %", value: (row) => String(row.slaAdherencePct) },
        ]),
      },
    ]);
  }, [cases, kpis, metrics, plantHealth, state, t]);

  return (
    <Button variant="secondary" size="md" onClick={onExport}>
      <Icon name="Download" size="sm" />
      {t("common.export")}
    </Button>
  );
}


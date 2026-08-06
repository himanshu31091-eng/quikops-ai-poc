"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import type {
  ActivityEvent,
  CaseListItem,
  ExecutionMetrics,
  KpiCardModel,
  RevenueImpactBucket,
} from "@/src/domain/types";
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


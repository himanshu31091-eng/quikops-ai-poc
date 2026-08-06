"use client";

import * as React from "react";
import { ActionToast } from "@/components/patterns/action-toast";
import { FilterMenu } from "@/components/patterns/filter-menu";
import { Icon } from "@/components/patterns/icon";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import type { ConnectorHealthData } from "@/src/data/queries/connectors";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { formatTimestamp } from "@/src/lib/format";
import { useConnectorHealth } from "../hooks/use-connector-health";
import type { ConnectorKpiTile, ConnectorScope } from "../types";
import { ConnectorCards } from "./connector-cards";
import {
  DeadLetterTable,
  FieldMappingTable,
  IngestionFunnelPanel,
  SyncHistoryTable,
} from "./connector-tables";

/**
 * Module root. Owns composition and nothing else: the session state lives in
 * useConnectorHealth, the presentation lives in the panels, and this file is the
 * wiring plus the layout.
 */

const TONE: Record<ConnectorKpiTile["tone"], { icon: string; ring: string }> = {
  neutral: { icon: "bg-surface-hover text-content-secondary", ring: "border-line-strong" },
  accent: { icon: "bg-accent-subtle text-accent", ring: "border-accent" },
  critical: { icon: "bg-critical-subtle text-critical", ring: "border-critical" },
  high: { icon: "bg-high-subtle text-high", ring: "border-high" },
  success: { icon: "bg-success-subtle text-success", ring: "border-success" },
};

const KpiTile = React.memo(function KpiTile({
  kpi,
  onSelect,
}: {
  kpi: ConnectorKpiTile;
  onSelect: (scope: ConnectorScope) => void;
}) {
  const tone = TONE[kpi.tone];
  const interactive = kpi.scope !== null;

  const body = (
    <>
      <span className="flex items-center gap-2">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", tone.icon)}>
          <Icon name={kpi.icon} size="sm" />
        </span>
        <span className="min-w-0 truncate text-2xs font-medium text-content-secondary">
          {kpi.label}
        </span>
      </span>
      <span className="mt-2.5 text-2xl font-semibold tracking-[-0.02em] text-content tabular-nums">
        {kpi.display}
      </span>
      <span className="mt-1.5 truncate text-2xs text-content-tertiary">{kpi.footnote}</span>
    </>
  );

  const className = cn(
    "anim-reveal flex min-w-0 flex-col rounded-lg border bg-surface px-3.5 py-3 text-left",
    kpi.active ? tone.ring : "border-line",
    interactive && "transition-colors duration-150 hover:bg-surface-hover",
  );

  return interactive ? (
    <button
      type="button"
      onClick={() => onSelect(kpi.scope!)}
      aria-pressed={kpi.active}
      className={cn(className, "focus-visible:outline-none")}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
});

interface ConnectorHealthViewProps {
  data: ConnectorHealthData;
  sessionUser: User;
}

export function ConnectorHealthView({ data, sessionUser }: ConnectorHealthViewProps) {
  const api = useConnectorHealth(data, sessionUser);
  const { model, filters, selectConnector } = api;

  const selected = model.connectors.find((connector) => connector.id === api.selectedId);

  const clearSelection = React.useCallback(() => selectConnector(null), [selectConnector]);

  const toggleSelection = React.useCallback(
    (id: string) => selectConnector(api.selectedId === id ? null : id),
    [selectConnector, api.selectedId],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="connectors"
        title="Connector Health"
        description="Every Angle ingestion status, run history, deduplication and dead-letter replay — the integration layer that turns signals into cases."
        meta={
          <>
            <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <Icon name="Clock" size="xs" />
              Data as at {formatTimestamp(DEMO_NOW)} UTC
            </span>
            <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <Icon name="PlugZap" size="xs" />
              {model.connectors.filter((c) => c.isEnabled).length} active of{" "}
              {model.connectors.length}
            </span>
            {api.replayedCount > 0 ? (
              <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
                <Icon name="RefreshCw" size="xs" />
                {api.replayedCount} replayed this session
              </span>
            ) : null}
          </>
        }
        actions={
          <Button
            variant="secondary"
            size="md"
            onClick={api.refresh}
            disabled={api.isRefreshing}
          >
            <Icon name="RefreshCw" size="sm" className={cn(api.isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2.5 sm:max-w-sm">
          <Icon name="Search" size="sm" className="shrink-0 text-content-tertiary" />
          <input
            value={filters.search}
            onChange={(event) => api.setSearch(event.target.value)}
            placeholder="Search connectors, systems, owners"
            aria-label="Search connectors"
            className="w-full bg-transparent text-xs text-content outline-none placeholder:text-content-tertiary"
          />
        </div>

        <FilterMenu
          label="Connector"
          icon="PlugZap"
          field="connectorIds"
          options={api.facets.connectorIds}
          selected={filters.connectorIds}
          onToggle={api.toggleFilterValue}
          onClear={api.clearFilterField}
          searchable
        />
        <FilterMenu
          label="Run status"
          icon="Activity"
          field="statuses"
          options={api.facets.statuses}
          selected={filters.statuses}
          onToggle={api.toggleFilterValue}
          onClear={api.clearFilterField}
        />

        {model.isFiltered ? (
          <Button variant="ghost" size="sm" onClick={api.clearFilters}>
            <Icon name="X" size="xs" />
            Clear filters
          </Button>
        ) : null}

        {selected ? (
          <span className="ml-auto flex items-center gap-1.5 rounded-sm border border-accent-line bg-accent-subtle px-2 py-1 text-2xs text-accent-content">
            Scoped to {selected.name}
            <button type="button" onClick={clearSelection} aria-label="Clear connector scope">
              <Icon name="X" size="xs" />
            </button>
          </span>
        ) : null}
      </div>

      {/* KPIs */}
      <section aria-label="Connector indicators">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((kpi) => (
            <KpiTile key={kpi.key} kpi={kpi} onSelect={api.setScope} />
          ))}
        </div>
      </section>

      {api.notice ? (
        <ActionToast
          message={api.notice.message}
          tone={api.notice.tone}
          placement="floating"
          onDismiss={api.dismissNotice}
        />
      ) : null}

      {/* Connector overview */}
      <SectionCard
        title="Connector overview"
        subtitle="Health, last and next sync, and throughput per feed"
        icon="PlugZap"
      >
        <ConnectorCards
          connectors={model.visibleConnectors}
          trends={model.trends}
          selectedId={api.selectedId}
          onSelect={toggleSelection}
          onClearFilters={api.clearFilters}
          isFiltered={model.isFiltered}
        />
      </SectionCard>

      {/* Funnel + dead letter */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title="Ingestion funnel"
            subtitle="What arrived, and what became work"
            icon="Filter"
            className="h-full"
          >
            <IngestionFunnelPanel funnel={model.funnel} />
          </SectionCard>
        </div>

        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title="Dead-letter queue"
            subtitle="Messages received but never delivered downstream"
            icon="OctagonAlert"
            flush
            className="h-full"
          >
            <DeadLetterTable
              rows={model.deadLetter}
              onReplay={api.replayMessage}
              onReplayAll={api.replayAll}
            />
          </SectionCard>
        </div>
      </div>

      {/* Sync history */}
      <SectionCard
        title="Sync history"
        subtitle={
          selected
            ? `Recent runs for ${selected.name}`
            : "Recent runs across every connector, newest first"
        }
        icon="History"
        flush
      >
        <SyncHistoryTable
          runs={
            selected
              ? api.runs.filter((run) => run.connectorId === selected.id)
              : api.runs
          }
          connectors={model.connectors}
        />
      </SectionCard>

      {/* Field mapping */}
      <SectionCard
        title="Field mapping"
        subtitle={
          selected
            ? `Source-to-target mapping for ${selected.name}`
            : "How upstream fields land on the QuikOps model. Select a connector to narrow."
        }
        icon="ArrowRight"
        flush
      >
        <FieldMappingTable
          mappings={data.fieldMappings}
          connectors={model.connectors}
          selectedId={api.selectedId}
        />
      </SectionCard>
    </div>
  );
}

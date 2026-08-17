"use client";

import * as React from "react";
import { connectorBandLabel, runStatusLabel } from "@/src/domain/labels";
import { useFormat, useLabels, useTranslation } from "@/src/i18n/provider";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { ProgressBar } from "@/components/patterns/progress-bar";
import { Sparkline } from "@/components/patterns/sparkline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CONNECTOR_HEALTH_META,
  CONNECTOR_STATUS_META,
} from "@/src/domain/connector-health";
import type { ConnectorView } from "@/src/data/queries/connectors";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { formatNumber, formatWhen } from "@/src/lib/format";
import type { ConnectorTrend } from "../types";

/**
 * The connector overview — one card per feed.
 *
 * Each card answers the four questions an integration owner actually has, in
 * the order they ask them: is it healthy, when did it last run, when does it run
 * next, and how much did it move. The health drivers sit behind a tooltip so the
 * score is interrogable without cluttering the grid.
 */

function relativeMinutes(minutes: number): string {
  const absolute = Math.abs(minutes);
  if (absolute < 60) return `${absolute}m`;
  if (absolute < 1_440) return `${Math.round(absolute / 60)}h`;
  return `${Math.round(absolute / 1_440)}d`;
}

const ConnectorCard = React.memo(function ConnectorCard({
  connector,
  trend,
  selected,
  onSelect,
}: {
  connector: ConnectorView;
  trend: ConnectorTrend | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  const health = CONNECTOR_HEALTH_META[connector.health.band];
  const status = CONNECTOR_STATUS_META[connector.lastStatus];
  const overdue = connector.minutesUntilNextRun < 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(connector.id)}
      aria-pressed={selected}
      className={cn(
        "anim-reveal flex min-w-0 flex-col rounded-lg border bg-surface p-3.5 text-left transition-colors duration-150",
        "hover:bg-surface-hover focus-visible:outline-none",
        selected ? "border-accent" : "border-line",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            connector.isEnabled ? "bg-accent-subtle text-accent" : "bg-surface-hover text-content-tertiary",
          )}
        >
          <Icon name={connector.icon} size="md" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-content">{connector.name}</p>
          <p className="truncate text-2xs text-content-tertiary">
            {connector.system} · {connector.direction.toLowerCase()}
          </p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex shrink-0 cursor-help items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
                health.className,
              )}
            >
              <Icon name={health.icon} size="xs" />
              {connectorBandLabel(connector.health.band, health.label, labels)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72">
            <p className="text-xs font-medium">
              Health {connector.health.score}/100
            </p>
            <ul className="mt-1 space-y-0.5">
              {connector.health.drivers.map((driver) => (
                <li key={driver.label} className="flex gap-1.5 text-2xs opacity-85">
                  <span>{driver.positive ? "+" : "−"}</span>
                  <span>
                    <span className="font-medium">{driver.label}</span> — {driver.detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 border-t border-line-inverse pt-1 text-2xs opacity-70">
              {t("actionCenter.scoredByADeterministicRule")}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-3">
        <ProgressBar
          value={connector.health.score}
          tone={
            connector.health.band === "HEALTHY"
              ? "success"
              : connector.health.band === "DEGRADED"
                ? "high"
                : connector.health.band === "FAILING"
                  ? "critical"
                  : "accent"
          }
        />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <div className="min-w-0">
          <dt className="text-2xs text-content-tertiary">{t("connectorHealth.lastSync")}</dt>
          <dd className="truncate text-2xs font-medium text-content">
            {formatWhen(connector.lastRunAt, DEMO_NOW, fmt)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-content-tertiary">{t("connectorHealth.nextSync")}</dt>
          <dd
            className={cn(
              "truncate text-2xs font-medium",
              !connector.isEnabled
                ? "text-content-tertiary"
                : overdue
                  ? "text-critical-content"
                  : "text-content",
            )}
          >
            {!connector.isEnabled
              ? "Paused"
              : overdue
                ? `Overdue by ${relativeMinutes(connector.minutesUntilNextRun)}`
                : `in ${relativeMinutes(connector.minutesUntilNextRun)}`}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-content-tertiary">{t("connectorHealth.recordsProcessed")}</dt>
          <dd className="truncate text-2xs font-medium tabular-nums text-content">
            {formatNumber(connector.recordsProcessed)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-content-tertiary">{t("connectorHealth.failedRecords")}</dt>
          <dd
            className={cn(
              "truncate text-2xs font-medium tabular-nums",
              connector.recordsFailed > 0 ? "text-critical-content" : "text-content-tertiary",
            )}
          >
            {formatNumber(connector.recordsFailed)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-line pt-2.5">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
              status.className,
            )}
          >
            <Icon name={status.icon} size="xs" />
            {runStatusLabel(connector.lastStatus, status.label, labels)}
          </span>
          {connector.deadLetterDepth > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-sm border border-critical-line bg-critical-subtle px-1.5 py-0.5 text-2xs font-medium text-critical-content">
              <Icon name="OctagonAlert" size="xs" />
              {connector.deadLetterDepth}
            </span>
          ) : null}
        </span>

        {trend && trend.points.length >= 2 ? (
          <Sparkline
            data={trend.points}
            tone={
              connector.health.band === "HEALTHY"
                ? "success"
                : connector.health.band === "FAILING"
                  ? "critical"
                  : "accent"
            }
            width={88}
            height={24}
          />
        ) : null}
      </div>
    </button>
  );
});

export function ConnectorCards({
  connectors,
  trends,
  selectedId,
  onSelect,
  onClearFilters,
  isFiltered,
}: {
  connectors: ConnectorView[];
  trends: ConnectorTrend[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearFilters: () => void;
  isFiltered: boolean;
}) {
  const { t } = useTranslation();
  if (connectors.length === 0) {
    return (
      <EmptyState
        icon="PlugZap"
        title={t("connectorHealth.noConnectorsMatchTheseFilters")}
        description={
          isFiltered
            ? "Widen the filters, or clear them to see every feed."
            : "No integrations are configured in this deployment."
        }
        {...(isFiltered
          ? {
              action: (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {t("common.clearFilters")}
                </button>
              ),
            }
          : {})}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {connectors.map((connector) => (
        <ConnectorCard
          key={connector.id}
          connector={connector}
          trend={trends.find((entry) => entry.connectorId === connector.id)}
          selected={selectedId === connector.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { runStatusLabel } from "@/src/domain/labels";
import { useFormat, useLabels, useTranslation } from "@/src/i18n/provider";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CONNECTOR_STATUS_META } from "@/src/domain/connector-health";
import type { ConnectorRun, FieldMapping } from "@/src/data/fixtures/connectors";
import type { ConnectorView, IngestionFunnel } from "@/src/data/queries/connectors";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { formatNumber, formatWhen } from "@/src/lib/format";
import type { DeadLetterRow } from "../types";

/**
 * The three tables and the funnel.
 *
 * Sync history, the dead-letter queue and the field-mapping viewer share one
 * header/cell treatment so the page reads as one surface, matching the tables in
 * Execution Analytics and the Action Center.
 */

const HEAD_CLASS =
  "px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-content-tertiary";
const CELL_CLASS = "px-3 py-2 align-middle";

/* ------------------------------------------------------------ Ingestion funnel */

/**
 * Received → deduplicated → processed → cases raised.
 *
 * Drawn as proportional bars rather than a chart: four ordered quantities where
 * each is a subset of the one before is a funnel, and a funnel is more legible
 * as bars than as anything Recharts would produce.
 */
export function IngestionFunnelPanel({ funnel }: { funnel: IngestionFunnel }) {
  const { t } = useTranslation();
  const stages = [
    { key: "received", label: t("connectorHealth.signalsReceived"), value: funnel.received, tone: "bg-chart-1" },
    {
      key: "deduplicated",
      label: t("connectorHealth.deduplicatedAway"),
      value: funnel.deduplicated,
      tone: "bg-chart-3",
    },
    { key: "rejected", label: t("connectorHealth.rejected"), value: funnel.rejected, tone: "bg-critical" },
    { key: "processed", label: t("connectorHealth.recordsApplied"), value: funnel.processed, tone: "bg-chart-6" },
  ];
  const peak = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <div>
      <ul className="space-y-2.5">
        {stages.map((stage) => (
          <li key={stage.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xs text-content-secondary">{stage.label}</span>
              <span className="text-xs font-semibold tabular-nums text-content">
                {formatNumber(stage.value)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
              <div
                className={cn("h-full rounded-full", stage.tone)}
                style={{ width: `${Math.max(2, (stage.value / peak) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-2xs text-content-tertiary">{t("connectorHealth.casesRaisedFromSignals")}</span>
        <span className="text-sm font-semibold tabular-nums text-content">
          {formatNumber(funnel.casesRaised)}
        </span>
      </div>
      <p className="mt-1.5 text-2xs leading-relaxed text-content-tertiary">
        A further {funnel.casesRaisedManually} case
        {funnel.casesRaisedManually === 1 ? " was" : "s were"} opened by hand and did not come
        through a connector.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- Sync history */

export function SyncHistoryTable({
  runs,
  connectors,
  limit = 14,
}: {
  runs: ConnectorRun[];
  connectors: ConnectorView[];
  limit?: number;
}) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  const nameById = React.useMemo(
    () => Object.fromEntries(connectors.map((connector) => [connector.id, connector.name])),
    [connectors],
  );

  if (runs.length === 0) {
    return (
      <EmptyState
        icon="History"
        title={t("connectorHealth.noRunsMatchTheseFilters")}
        description={t("connectorHealth.widenTheConnectorOrStatus")}
        size="sm"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-subtle">
            <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.started")}</th>
            <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.connector")}</th>
            <th scope="col" className={HEAD_CLASS}>{t("col.status")}</th>
            <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("connectorHealth.received")}</th>
            <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("connectorHealth.applied")}</th>
            <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("connectorHealth.failed")}</th>
            <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("shell.cases")}</th>
            <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("connectorHealth.duration")}</th>
          </tr>
        </thead>
        <tbody>
          {runs.slice(0, limit).map((run) => {
            const status = CONNECTOR_STATUS_META[run.status];
            return (
              <tr
                key={run.id}
                className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-hover"
              >
                <td className={cn(CELL_CLASS, "text-2xs text-content-secondary")}>
                  {formatWhen(run.startedAt, DEMO_NOW, fmt)}
                </td>
                <td className={cn(CELL_CLASS, "min-w-0")}>
                  <span className="block truncate text-2xs text-content">
                    {nameById[run.connectorId] ?? run.connectorId}
                  </span>
                </td>
                <td className={CELL_CLASS}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "inline-flex cursor-help items-center gap-1 rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
                          status.className,
                        )}
                      >
                        <Icon name={status.icon} size="xs" />
                        {runStatusLabel(run.status, status.label, labels)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-72">
                      <p className="text-2xs">{run.message}</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
                <td className={cn(CELL_CLASS, "text-right text-2xs tabular-nums text-content-secondary")}>
                  {formatNumber(run.recordsReceived)}
                </td>
                <td className={cn(CELL_CLASS, "text-right text-2xs tabular-nums text-content-secondary")}>
                  {formatNumber(run.recordsProcessed)}
                </td>
                <td className={cn(CELL_CLASS, "text-right")}>
                  <span
                    className={cn(
                      "text-2xs tabular-nums",
                      run.recordsFailed > 0
                        ? "font-semibold text-critical-content"
                        : "text-content-tertiary",
                    )}
                  >
                    {formatNumber(run.recordsFailed)}
                  </span>
                </td>
                <td className={cn(CELL_CLASS, "text-right text-2xs tabular-nums text-content-secondary")}>
                  {run.casesRaised > 0 ? run.casesRaised : "—"}
                </td>
                <td className={cn(CELL_CLASS, "text-right text-2xs tabular-nums text-content-tertiary")}>
                  {run.durationSeconds}s
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------- Dead letter queue */

export function DeadLetterTable({
  rows,
  onReplay,
  onReplayAll,
}: {
  rows: DeadLetterRow[];
  onReplay: (id: string) => void;
  onReplayAll: (ids: string[]) => void;
}) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const open = rows.filter((row) => !row.isReplayed);
  const replayable = open.filter((row) => !row.isUnreplayable);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="CircleCheck"
        title={t("connectorHealth.deadLetterQueueIsEmpty")}
        description={t("connectorHealth.everyMessageReceivedHasBeen")}
        size="sm"
      />
    );
  }

  return (
    <div>
      {replayable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <span className="text-2xs text-content-secondary">
            {open.length} undelivered · {replayable.length} replayable
          </span>
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            onClick={() => onReplayAll(replayable.map((row) => row.id))}
          >
            <Icon name="RefreshCw" size="sm" />
            {t("connectorHealth.replayAllReplayable")}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-160 border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-subtle">
              <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.reference")}</th>
              <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.connector")}</th>
              <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.reason")}</th>
              <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.received")}</th>
              <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("connectorHealth.attempts")}</th>
              <th scope="col" className={cn(HEAD_CLASS, "text-right")}>{t("col.action")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-line transition-colors duration-150 last:border-0",
                  row.isReplayed ? "bg-success-subtle" : "hover:bg-surface-hover",
                )}
              >
                <td className={CELL_CLASS}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-mono text-2xs text-content">
                        {row.signalRef}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-80">
                      <p className="text-2xs font-medium">{row.detail}</p>
                      <p className="mt-1 font-mono text-2xs opacity-75">
                        {row.payloadPreview}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {row.field ? (
                    <span className="ml-1.5 rounded-sm bg-surface-hover px-1 py-px font-mono text-2xs text-content-tertiary">
                      {row.field}
                    </span>
                  ) : null}
                </td>
                <td className={cn(CELL_CLASS, "min-w-0")}>
                  <span className="block truncate text-2xs text-content-secondary">
                    {row.connectorName}
                  </span>
                </td>
                <td className={CELL_CLASS}>
                  <span className="text-2xs text-content">{row.reasonLabel}</span>
                </td>
                <td className={cn(CELL_CLASS, "text-2xs text-content-tertiary")}>
                  {formatWhen(row.receivedAt, DEMO_NOW, fmt)}
                </td>
                <td className={cn(CELL_CLASS, "text-right text-2xs tabular-nums text-content-secondary")}>
                  {row.attempts}
                </td>
                <td className={cn(CELL_CLASS, "text-right")}>
                  {row.isReplayed ? (
                    <span className="inline-flex items-center gap-1 text-2xs font-medium text-success-content">
                      <Icon name="Check" size="xs" />
                      {t("connectorHealth.replayed")}
                    </span>
                  ) : row.isUnreplayable ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-2xs text-content-tertiary underline decoration-dotted underline-offset-2">
                          {t("connectorHealth.notReplayable")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-72">
                        <p className="text-2xs">
                          {row.reasonDetail} A replay would produce the same result — the
                          upstream contract has to change first.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button variant="secondary" size="xs" onClick={() => onReplay(row.id)}>
                      <Icon name="RefreshCw" size="xs" />
                      {t("connectorHealth.replay")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Field mapping */

export function FieldMappingTable({
  mappings,
  connectors,
  selectedId,
}: {
  mappings: FieldMapping[];
  connectors: ConnectorView[];
  selectedId: string | null;
}) {
  const { t } = useTranslation();
  const scoped = selectedId
    ? mappings.filter((mapping) => mapping.connectorId === selectedId)
    : mappings;
  const nameById = React.useMemo(
    () => Object.fromEntries(connectors.map((connector) => [connector.id, connector.name])),
    [connectors],
  );

  if (scoped.length === 0) {
    return (
      <EmptyState
        icon="ArrowRight"
        title={t("connectorHealth.noFieldMapping")}
        description={t("connectorHealth.thisConnectorDoesNotDeclare")}
        size="sm"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-subtle">
            {selectedId === null ? <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.connector")}</th> : null}
            <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.sourceField")}</th>
            <th scope="col" className={HEAD_CLASS}>Type</th>
            <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.quikopsField")}</th>
            <th scope="col" className={HEAD_CLASS}>Type</th>
            <th scope="col" className={HEAD_CLASS}>{t("connectorHealth.transform")}</th>
          </tr>
        </thead>
        <tbody>
          {scoped.map((mapping, index) => (
            <tr
              key={`${mapping.connectorId}-${mapping.sourceField}-${index}`}
              className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-hover"
            >
              {selectedId === null ? (
                <td className={cn(CELL_CLASS, "min-w-0")}>
                  <span className="block truncate text-2xs text-content-tertiary">
                    {nameById[mapping.connectorId] ?? mapping.connectorId}
                  </span>
                </td>
              ) : null}
              <td className={CELL_CLASS}>
                <span className="font-mono text-2xs text-content">{mapping.sourceField}</span>
                {mapping.required ? (
                  <span className="ml-1 text-2xs text-critical">*</span>
                ) : null}
              </td>
              <td className={cn(CELL_CLASS, "font-mono text-2xs text-content-tertiary")}>
                {mapping.sourceType}
              </td>
              <td className={CELL_CLASS}>
                <span className="flex items-center gap-1.5">
                  <Icon name="ArrowRight" size="xs" className="shrink-0 text-content-tertiary" />
                  <span className="font-mono text-2xs text-content">{mapping.targetField}</span>
                </span>
              </td>
              <td className={cn(CELL_CLASS, "font-mono text-2xs text-content-tertiary")}>
                {mapping.targetType}
              </td>
              <td className={cn(CELL_CLASS, "text-2xs text-content-secondary")}>
                {mapping.transform ?? <span className="text-content-tertiary">{t("connectorHealth.direct")}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

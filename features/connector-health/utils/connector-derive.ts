import { CONNECTOR_HEALTH_META, HEALTH_WINDOW_RUNS } from "@/src/domain/connector-health";
import type { ConnectorRun, DeadLetterMessage } from "@/src/data/fixtures/connectors";
import { DEAD_LETTER_REASON_META } from "@/src/data/fixtures/connectors";
import type { ConnectorView } from "@/src/data/queries/connectors";
import { formatNumber, formatPercent } from "@/src/lib/format";
import type {
  ConnectorFilters,
  ConnectorKpiTile,
  ConnectorTrend,
  DeadLetterRow,
  HealthTrendPoint,
} from "../types";

/**
 * Filtering, KPI tiles and trend shaping.
 *
 * No business rule is restated: health scoring and banding come from
 * `src/domain/connector-health.ts`, reason copy from the fixture. This module
 * counts, groups and formats.
 */

/**
 * Reasons a replay can never fix. Retrying a duplicate just produces the same
 * duplicate, and a schema mismatch needs a contract change upstream — offering
 * a button that cannot work is worse than offering none.
 */
const UNREPLAYABLE = new Set(["DUPLICATE_KEY", "SCHEMA_MISMATCH"]);

export function toDeadLetterRow(
  message: DeadLetterMessage,
  connectors: ConnectorView[],
  replayedIds: Set<string>,
): DeadLetterRow {
  const meta = DEAD_LETTER_REASON_META[message.reason];
  return {
    ...message,
    connectorName:
      connectors.find((connector) => connector.id === message.connectorId)?.name ??
      message.connectorId,
    isReplayed: replayedIds.has(message.id),
    isUnreplayable: UNREPLAYABLE.has(message.reason),
    reasonLabel: meta.label,
    reasonDetail: meta.detail,
  };
}

/* ------------------------------------------------------------------ Filtering */

export function filterConnectors(
  connectors: ConnectorView[],
  filters: ConnectorFilters,
  openDeadLetterByConnector: Record<string, number>,
): ConnectorView[] {
  const needle = filters.search.trim().toLowerCase();

  return connectors.filter((connector) => {
    if (
      filters.connectorIds.length > 0 &&
      !filters.connectorIds.includes(connector.id)
    ) {
      return false;
    }
    if (
      needle !== "" &&
      !`${connector.name} ${connector.system} ${connector.ownerTeam} ${connector.description}`
        .toLowerCase()
        .includes(needle)
    ) {
      return false;
    }

    switch (filters.scope) {
      case "attention":
        return connector.health.band === "DEGRADED" || connector.health.band === "FAILING";
      case "stale":
        return connector.health.band === "STALE";
      case "dead-letter":
        return (openDeadLetterByConnector[connector.id] ?? 0) > 0;
      default:
        return true;
    }
  });
}

export function isFiltered(filters: ConnectorFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.scope !== "all" ||
    filters.connectorIds.length > 0 ||
    filters.statuses.length > 0
  );
}

export function filterRuns(
  runs: ConnectorRun[],
  filters: ConnectorFilters,
  visibleConnectorIds: Set<string>,
): ConnectorRun[] {
  return runs
    .filter((run) => visibleConnectorIds.has(run.connectorId))
    .filter((run) => filters.statuses.length === 0 || filters.statuses.includes(run.status))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

/* ------------------------------------------------------------------ KPI tiles */

export function buildKpiTiles(
  connectors: ConnectorView[],
  openDeadLetterDepth: number,
  casesRaised: number,
  filters: ConnectorFilters,
): ConnectorKpiTile[] {
  const enabled = connectors.filter((connector) => connector.isEnabled);
  const attention = connectors.filter(
    (connector) =>
      connector.health.band === "DEGRADED" || connector.health.band === "FAILING",
  ).length;
  const stale = connectors.filter((connector) => connector.health.band === "STALE").length;

  // Integration health is the mean across enabled connectors: a paused feed is
  // not a sick one, and averaging it in would understate a real problem.
  const meanHealth =
    enabled.length === 0
      ? 0
      : Math.round(
          enabled.reduce((sum, connector) => sum + connector.health.score, 0) /
            enabled.length,
        );

  const processed = connectors.reduce((sum, c) => sum + c.recordsProcessed, 0);
  const rejected = connectors.reduce((sum, c) => sum + c.recordsFailed, 0);
  const rejectionRate = processed + rejected === 0 ? 0 : (rejected / (processed + rejected)) * 100;

  return [
    {
      key: "integration-health",
      label: "Integration health",
      display: `${meanHealth}`,
      footnote:
        attention === 0 && stale === 0
          ? `All ${enabled.length} active feeds healthy`
          : `${attention} needing attention · ${stale} stale`,
      icon: "PlugZap",
      tone: attention > 0 ? "high" : stale > 0 ? "accent" : "success",
      scope: attention > 0 ? "attention" : null,
      active: filters.scope === "attention",
    },
    {
      key: "records",
      label: "Records processed",
      display: formatNumber(processed),
      footnote: `${formatPercent(rejectionRate, 2)} rejected over the last ${HEALTH_WINDOW_RUNS} runs`,
      icon: "Boxes",
      tone: "neutral",
      scope: null,
      active: false,
    },
    {
      key: "dead-letter",
      label: "Dead-letter queue",
      display: formatNumber(openDeadLetterDepth),
      footnote:
        openDeadLetterDepth === 0
          ? "Nothing undelivered"
          : "Received but never delivered downstream",
      icon: "OctagonAlert",
      tone: openDeadLetterDepth > 0 ? "critical" : "success",
      scope: "dead-letter",
      active: filters.scope === "dead-letter",
    },
    {
      key: "cases-raised",
      label: "Cases raised",
      display: formatNumber(casesRaised),
      footnote: "Signals that became owned work",
      icon: "Rows3",
      tone: "accent",
      scope: null,
      active: false,
    },
  ];
}

/* --------------------------------------------------------------- Health trend */

/**
 * A health trend per connector, reconstructed from its run history.
 *
 * Scored the same way the live band is — a failed run costs more than a partial
 * one, rejections cost proportionally — so the line and the badge tell the same
 * story rather than two loosely-related ones.
 */
export function buildTrends(
  connectors: ConnectorView[],
  runs: ConnectorRun[],
): ConnectorTrend[] {
  return connectors.map((connector) => {
    const mine = runs
      .filter((run) => run.connectorId === connector.id)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    const points: HealthTrendPoint[] = mine.map((run) => {
      let value = 100;
      if (run.status === "FAILED") value -= 55;
      else if (run.status === "PARTIAL") value -= 22;
      const total = run.recordsProcessed + run.recordsFailed;
      if (total > 0) value -= Math.min(20, (run.recordsFailed / total) * 400);
      return {
        date: run.startedAt.slice(0, 10),
        value: Math.max(0, Math.round(value)),
      };
    });

    return {
      connectorId: connector.id,
      connectorName: connector.name,
      band: connector.health.band,
      points,
    };
  });
}

export { CONNECTOR_HEALTH_META };

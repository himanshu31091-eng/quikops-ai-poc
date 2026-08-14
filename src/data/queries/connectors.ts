import {
  minutesUntilNextRun,
  scoreConnectorHealth,
  type ConnectorHealth,
} from "@/src/domain/connector-health";
import type { DetectionSource } from "@/src/domain/types";
import {
  CONNECTORS,
  CONNECTOR_RUNS,
  DEAD_LETTER,
  FIELD_MAPPINGS,
  type ConnectorDefinition,
  type ConnectorRun,
  type DeadLetterMessage,
  type FieldMapping,
} from "../fixtures/connectors";
import { getCaseCorpus } from "./corpus";
import { DEMO_NOW } from "@/src/lib/constants";

/**
 * Connector Health data access.
 *
 * Same contract as every other query module: async, finished view model,
 * fixture read swappable for a real query without touching a caller.
 *
 * Health is scored here rather than in the component so the card, the detail
 * panel and the KPI band all read one number.
 */

export interface ConnectorView extends ConnectorDefinition {
  health: ConnectorHealth;
  lastRunAt: string;
  nextRunAt: string;
  minutesUntilNextRun: number;
  lastStatus: ConnectorRun["status"];
  deadLetterDepth: number;
  /** Totals across the scored window. */
  recordsProcessed: number;
  recordsFailed: number;
  recordsDeduplicated: number;
  casesRaised: number;
  /** Success/partial/failed counts over the window, for the trend strip. */
  runOutcomes: { success: number; partial: number; failed: number };
}

/** The ingestion funnel, network-wide. */
export interface IngestionFunnel {
  received: number;
  deduplicated: number;
  processed: number;
  rejected: number;
  casesRaised: number;
  /** Cases opened by hand, which no connector delivered. */
  casesRaisedManually: number;
}

export interface ConnectorKpis {
  totalConnectors: number;
  healthy: number;
  degraded: number;
  failing: number;
  stale: number;
  deadLetterDepth: number;
  recordsProcessed: number;
  rejectionRatePct: number;
  casesRaised: number;
}

export interface ConnectorHealthData {
  connectors: ConnectorView[];
  runs: ConnectorRun[];
  deadLetter: DeadLetterMessage[];
  fieldMappings: FieldMapping[];
  funnel: IngestionFunnel;
  kpis: ConnectorKpis;
}

const MINUTE_MS = 60_000;

function buildConnectorView(
  connector: ConnectorDefinition,
  runs: ConnectorRun[],
  deadLetter: DeadLetterMessage[],
): ConnectorView {
  const mine = runs
    .filter((run) => run.connectorId === connector.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const lastRunAt =
    mine[0]?.startedAt ??
    new Date(DEMO_NOW.getTime() - connector.minutesSinceLastRun * MINUTE_MS).toISOString();
  const deadLetterDepth = deadLetter.filter(
    (entry) => entry.connectorId === connector.id,
  ).length;

  const health = scoreConnectorHealth(
    {
      runs: mine.map((run) => ({
        status: run.status,
        recordsProcessed: run.recordsProcessed,
        recordsFailed: run.recordsFailed,
      })),
      deadLetterDepth,
      lastRunAt,
      cadenceMinutes: connector.cadenceMinutes,
      isEnabled: connector.isEnabled,
    },
    DEMO_NOW,
  );

  const untilNext = minutesUntilNextRun(lastRunAt, connector.cadenceMinutes, DEMO_NOW);

  return {
    ...connector,
    health,
    lastRunAt,
    nextRunAt: new Date(
      new Date(lastRunAt).getTime() + connector.cadenceMinutes * MINUTE_MS,
    ).toISOString(),
    minutesUntilNextRun: untilNext,
    lastStatus: mine[0]?.status ?? "FAILED",
    deadLetterDepth,
    recordsProcessed: mine.reduce((sum, run) => sum + run.recordsProcessed, 0),
    recordsFailed: mine.reduce((sum, run) => sum + run.recordsFailed, 0),
    recordsDeduplicated: mine.reduce((sum, run) => sum + run.recordsDeduplicated, 0),
    casesRaised: mine.reduce((sum, run) => sum + run.casesRaised, 0),
    runOutcomes: {
      success: mine.filter((run) => run.status === "SUCCESS").length,
      partial: mine.filter((run) => run.status === "PARTIAL").length,
      failed: mine.filter((run) => run.status === "FAILED").length,
    },
  };
}

export async function getConnectorHealthData(): Promise<ConnectorHealthData> {
  const connectors = CONNECTORS.map((connector) =>
    buildConnectorView(connector, CONNECTOR_RUNS, DEAD_LETTER),
  );

  const received = connectors.reduce(
    (sum, connector) =>
      sum + connector.recordsProcessed + connector.recordsDeduplicated + connector.recordsFailed,
    0,
  );
  const processed = connectors.reduce((sum, c) => sum + c.recordsProcessed, 0);
  const rejected = connectors.reduce((sum, c) => sum + c.recordsFailed, 0);

  // Cases raised is counted from the corpus, not from the runs, so the funnel
  // can never claim more cases than the queue actually holds.
  const corpus = await getCaseCorpus();
  const raisedBySource = (source: DetectionSource): number =>
    corpus.filter((item) => item.detectedBy === source).length;

  return {
    connectors,
    runs: CONNECTOR_RUNS,
    deadLetter: DEAD_LETTER,
    fieldMappings: FIELD_MAPPINGS,
    funnel: {
      received,
      deduplicated: connectors.reduce((sum, c) => sum + c.recordsDeduplicated, 0),
      processed,
      rejected,
      casesRaised: raisedBySource("EVERY_ANGLE") + raisedBySource("PLAYBOOK_MONITOR"),
      casesRaisedManually: raisedBySource("MANUAL"),
    },
    kpis: {
      totalConnectors: connectors.length,
      healthy: connectors.filter((c) => c.health.band === "HEALTHY").length,
      degraded: connectors.filter((c) => c.health.band === "DEGRADED").length,
      failing: connectors.filter((c) => c.health.band === "FAILING").length,
      stale: connectors.filter((c) => c.health.band === "STALE").length,
      deadLetterDepth: DEAD_LETTER.length,
      recordsProcessed: processed,
      rejectionRatePct:
        processed + rejected === 0
          ? 0
          : Math.round((rejected / (processed + rejected)) * 10_000) / 100,
      casesRaised: raisedBySource("EVERY_ANGLE") + raisedBySource("PLAYBOOK_MONITOR"),
    },
  };
}

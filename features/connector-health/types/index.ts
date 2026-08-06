import type { ConnectorHealthBand } from "@/src/domain/connector-health";
import type { ConnectorStatus } from "@/src/domain/types";
import type {
  ConnectorView,
  IngestionFunnel,
} from "@/src/data/queries/connectors";
import type { DeadLetterMessage } from "@/src/data/fixtures/connectors";

/**
 * Connector Health contracts.
 *
 * Everything the module renders is a pure function of the server data plus the
 * session's replay decisions, so the KPI band, the cards, the queue and the
 * history table derive from one memoised pass and cannot disagree.
 */

/** The three things a manager filters an integration board by. */
export type ConnectorScope = "all" | "attention" | "stale" | "dead-letter";

export interface ConnectorFilters {
  search: string;
  scope: ConnectorScope;
  /** Connector ids; empty means every connector. */
  connectorIds: string[];
  /** Run outcomes shown in the history table. */
  statuses: ConnectorStatus[];
}

export const EMPTY_CONNECTOR_FILTERS: ConnectorFilters = {
  search: "",
  scope: "all",
  connectorIds: [],
  statuses: [],
};

export type ConnectorFilterField = "connectorIds" | "statuses";

/** A dead-letter row with its session state folded in. */
export interface DeadLetterRow extends DeadLetterMessage {
  connectorName: string;
  /** Replayed in this session — the row stays visible but is resolved. */
  isReplayed: boolean;
  /** Replay was attempted and the reason makes success impossible. */
  isUnreplayable: boolean;
  reasonLabel: string;
  reasonDetail: string;
}

export interface ConnectorKpiTile {
  key: "integration-health" | "records" | "dead-letter" | "cases-raised";
  label: string;
  /** Pre-formatted for display — units differ per tile. */
  display: string;
  footnote: string;
  icon: string;
  tone: "neutral" | "accent" | "critical" | "high" | "success";
  /** The scope this tile switches to, when it is a filter preset. */
  scope: ConnectorScope | null;
  active: boolean;
}

/** One point on the per-connector health trend. */
export interface HealthTrendPoint {
  date: string;
  value: number;
}

export interface ConnectorTrend {
  connectorId: string;
  connectorName: string;
  band: ConnectorHealthBand;
  points: HealthTrendPoint[];
}

/** Everything the page renders, derived in one pass. */
export interface ConnectorHealthModel {
  connectors: ConnectorView[];
  visibleConnectors: ConnectorView[];
  kpis: ConnectorKpiTile[];
  funnel: IngestionFunnel;
  deadLetter: DeadLetterRow[];
  trends: ConnectorTrend[];
  /** Open dead-letter depth after session replays. */
  openDeadLetterDepth: number;
  isFiltered: boolean;
}

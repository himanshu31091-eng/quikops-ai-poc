import type { ConnectorStatus, DetectionSource } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { CASES } from "./cases";

/**
 * The integration landscape behind QuikOps.
 *
 * Deliberately reconciled with the case corpus rather than invented alongside
 * it: the enterprise data platform signal connector reports exactly as many
 * raised cases as there are cases with `detectedBy: "EVERY_ANGLE"`, and the playbook monitor
 * reports the ones marked `PLAYBOOK_MONITOR`. Manual cases belong to no
 * connector, because a person opened them.
 *
 * That coupling is the whole point. Fixture reconciliation (D-48) existed
 * because hand-authored numbers drifted from the data they described; a
 * connector screen claiming it raised 34 cases beside a queue holding 29 would
 * be the same defect in a new place.
 *
 * Run history is generated from a seeded PRNG for the same reason the trend
 * series are — byte-identical on every render and every rehearsal.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** mulberry32, as used by the KPI series. Organic-looking, entirely repeatable. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ConnectorDirection = "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";

export interface ConnectorDefinition {
  id: string;
  name: string;
  /** The system on the other end. */
  system: string;
  description: string;
  direction: ConnectorDirection;
  /** Expected minutes between runs. */
  cadenceMinutes: number;
  isEnabled: boolean;
  /** Which detection source this feed is responsible for, when it raises cases. */
  raisesFor: DetectionSource | null;
  ownerTeam: string;
  icon: string;
  /** Seeds the run history so each connector has its own repeatable shape. */
  seed: number;
  /** Typical rows per run, before variance. */
  baseVolume: number;
  /** 0–1. How often a run comes back failed or partial. */
  instability: number;
  /** Minutes since the last run finished. Drives freshness scoring. */
  minutesSinceLastRun: number;
}

export const CONNECTORS: ConnectorDefinition[] = [
  {
    id: "conn_ea_signals",
    name: "Enterprise Data Platform — Exception Signals",
    system: "Enterprise Data Platform",
    description:
      "Evaluates the operational rule set against plant data and raises a signal for every condition that holds. The primary source of cases.",
    direction: "INBOUND",
    cadenceMinutes: 120,
    isEnabled: true,
    raisesFor: "EVERY_ANGLE",
    ownerTeam: "Integration Platform",
    icon: "PlugZap",
    seed: 40182,
    baseVolume: 1_840,
    instability: 0.12,
    minutesSinceLastRun: 118,
  },
  {
    id: "conn_ea_kpi",
    name: "Enterprise Data Platform — KPI Snapshots",
    system: "Enterprise Data Platform",
    description:
      "Delivers measured OTIF, supplier OTD, schedule adherence and inventory coverage per plant. Read by the dashboard; never recomputed here.",
    direction: "INBOUND",
    cadenceMinutes: 1_440,
    isEnabled: true,
    raisesFor: null,
    ownerTeam: "Integration Platform",
    icon: "ChartNoAxesColumn",
    seed: 77120,
    baseVolume: 96,
    instability: 0.04,
    minutesSinceLastRun: 402,
  },
  {
    id: "conn_playbook_monitor",
    name: "Playbook Recurrence Monitor",
    system: "QuikOps internal",
    description:
      "Watches closed cases for the same condition re-appearing inside the recurrence window and reopens or raises accordingly.",
    direction: "INBOUND",
    cadenceMinutes: 360,
    isEnabled: true,
    raisesFor: "PLAYBOOK_MONITOR",
    ownerTeam: "Operations Engineering",
    icon: "BookMarked",
    seed: 31190,
    baseVolume: 240,
    instability: 0.08,
    minutesSinceLastRun: 96,
  },
  {
    id: "conn_sap_master",
    name: "SAP ERP — Master Data",
    system: "SAP S/4HANA",
    description:
      "Materials, plants, suppliers and customers. Keeps case reference data resolvable without a round trip to the ERP.",
    direction: "INBOUND",
    cadenceMinutes: 720,
    isEnabled: true,
    raisesFor: null,
    ownerTeam: "ERP Basis",
    icon: "Boxes",
    seed: 90014,
    baseVolume: 12_400,
    instability: 0.18,
    minutesSinceLastRun: 1_986,
  },
  {
    id: "conn_sap_orders",
    name: "SAP ERP — Orders & Demand",
    system: "SAP S/4HANA",
    description:
      "Purchase orders, sales orders and confirmed demand. Supplies the promised dates behind revenue at risk.",
    direction: "INBOUND",
    cadenceMinutes: 60,
    isEnabled: true,
    raisesFor: null,
    ownerTeam: "ERP Basis",
    icon: "FileText",
    seed: 44182,
    baseVolume: 4_100,
    instability: 0.1,
    minutesSinceLastRun: 41,
  },
  {
    // The second ERP. Northbridge runs SAP at the European and US sites and
    // Oracle at Querétaro and Pune following an acquisition — which is the
    // ordinary situation and the reason the ingestion layer normalises rather
    // than assuming one source. It is the least stable feed in the estate
    // because it crosses a network the group does not operate.
    id: "conn_oracle_scm",
    name: "Oracle SCM — Plant Operations",
    system: "Oracle Fusion Cloud SCM",
    description:
      "Work orders, on-hand balances and goods movements for Querétaro and Pune. The Oracle side of the estate, normalised into the same signal shape as SAP.",
    direction: "INBOUND",
    cadenceMinutes: 90,
    isEnabled: true,
    raisesFor: null,
    ownerTeam: "ERP Integration",
    icon: "Boxes",
    seed: 70413,
    baseVolume: 2_650,
    instability: 0.22,
    minutesSinceLastRun: 112,
  },
  {
    id: "conn_outbound_notify",
    name: "Notification Gateway",
    system: "Microsoft 365",
    description:
      "Outbound assignment, escalation and verification notifications to owners and reviewers.",
    direction: "OUTBOUND",
    cadenceMinutes: 15,
    isEnabled: false,
    raisesFor: null,
    ownerTeam: "Integration Platform",
    icon: "Send",
    seed: 20260805,
    baseVolume: 62,
    instability: 0.05,
    minutesSinceLastRun: 2_760,
  },
];

/* ------------------------------------------------------------- Run history */

export interface ConnectorRun {
  id: string;
  connectorId: string;
  startedAt: string;
  /** Wall-clock duration in seconds. */
  durationSeconds: number;
  status: ConnectorStatus;
  recordsReceived: number;
  recordsProcessed: number;
  recordsDeduplicated: number;
  recordsFailed: number;
  /** Cases raised by this run. Only ever non-zero for case-raising feeds. */
  casesRaised: number;
  message: string;
}

/** How many runs of history to generate per connector. */
const RUNS_PER_CONNECTOR = 18;

const FAILURE_MESSAGES = [
  "Upstream returned 503 during extract; run abandoned after 2 retries.",
  "Schema drift: unexpected column in the source payload.",
  "Authentication token expired mid-run.",
  "Read timeout against the source system.",
];

const PARTIAL_MESSAGES = [
  "Completed with rejected rows — see the dead-letter queue.",
  "Some records failed validation and were routed to dead letter.",
  "Partial extract: one plant returned no data.",
];

/**
 * Deterministic run history, newest first.
 *
 * Cases raised are distributed across the window rather than invented: the
 * connector's total for the period equals the number of cases in the corpus
 * that name it as their detection source.
 */
function buildRuns(connector: ConnectorDefinition): ConnectorRun[] {
  const random = mulberry32(connector.seed);
  const runs: ConnectorRun[] = [];

  const totalCases =
    connector.raisesFor === null
      ? 0
      : CASES.filter((item) => item.detectedBy === connector.raisesFor).length;

  // Cases are raised by the more recent runs, in ones and twos, so the numbers
  // add up to the corpus without every run claiming an implausible batch.
  let remainingCases = totalCases;

  for (let index = 0; index < RUNS_PER_CONNECTOR; index += 1) {
    const startedAt = new Date(
      DEMO_NOW.getTime() -
        connector.minutesSinceLastRun * MINUTE_MS -
        index * connector.cadenceMinutes * MINUTE_MS,
    ).toISOString();

    const roll = random();
    const status: ConnectorStatus =
      roll < connector.instability * 0.35
        ? "FAILED"
        : roll < connector.instability
          ? "PARTIAL"
          : "SUCCESS";

    const received =
      status === "FAILED"
        ? 0
        : Math.round(connector.baseVolume * (0.82 + random() * 0.36));
    const deduplicated = status === "FAILED" ? 0 : Math.round(received * (0.04 + random() * 0.06));
    const failedRows =
      status === "PARTIAL"
        ? Math.round(received * (0.008 + random() * 0.022))
        : status === "FAILED"
          ? 0
          : Math.round(received * random() * 0.002);
    const processed = Math.max(0, received - deduplicated - failedRows);

    // Only successful, case-raising runs in the first third of the window
    // account for the corpus; older ones are history.
    let casesRaised = 0;
    if (status !== "FAILED" && remainingCases > 0 && index < RUNS_PER_CONNECTOR / 2) {
      casesRaised = Math.min(remainingCases, random() < 0.45 ? 2 : 1);
      remainingCases -= casesRaised;
    }

    runs.push({
      id: `run_${connector.id}_${index}`,
      connectorId: connector.id,
      startedAt,
      durationSeconds:
        status === "FAILED"
          ? Math.round(8 + random() * 20)
          : Math.round(connector.baseVolume / 90 + random() * 24 + 6),
      status,
      recordsReceived: received,
      recordsProcessed: processed,
      recordsDeduplicated: deduplicated,
      recordsFailed: failedRows,
      casesRaised,
      message:
        status === "FAILED"
          ? (FAILURE_MESSAGES[index % FAILURE_MESSAGES.length] ?? "Run failed.")
          : status === "PARTIAL"
            ? (PARTIAL_MESSAGES[index % PARTIAL_MESSAGES.length] ?? "Completed with rejections.")
            : `Completed. ${processed.toLocaleString("en-US")} records applied.`,
    });
  }

  // Anything the loop could not place goes on the most recent successful run,
  // so the connector's reported total always equals the corpus.
  if (remainingCases > 0) {
    const target = runs.find((run) => run.status !== "FAILED");
    if (target) target.casesRaised += remainingCases;
  }

  return runs;
}

export const CONNECTOR_RUNS: ConnectorRun[] = CONNECTORS.flatMap(buildRuns);

/* --------------------------------------------------------- Dead letter queue */

export type DeadLetterReason =
  | "SCHEMA_MISMATCH"
  | "MISSING_REFERENCE"
  | "VALIDATION_FAILED"
  | "DUPLICATE_KEY"
  | "DOWNSTREAM_TIMEOUT";

export const DEAD_LETTER_REASON_META: Record<
  DeadLetterReason,
  { label: string; detail: string }
> = {
  SCHEMA_MISMATCH: {
    label: "Schema mismatch",
    detail: "The payload did not match the expected contract for this feed.",
  },
  MISSING_REFERENCE: {
    label: "Missing reference",
    detail: "A referenced material, plant or supplier does not exist in master data.",
  },
  VALIDATION_FAILED: {
    label: "Validation failed",
    detail: "A required field was absent or outside its permitted range.",
  },
  DUPLICATE_KEY: {
    label: "Duplicate key",
    detail: "A record with this signal reference has already been ingested.",
  },
  DOWNSTREAM_TIMEOUT: {
    label: "Downstream timeout",
    detail: "QuikOps did not acknowledge the message inside the delivery window.",
  },
};

export interface DeadLetterMessage {
  id: string;
  connectorId: string;
  /** The upstream reference, in the same shape cases carry. */
  signalRef: string;
  reason: DeadLetterReason;
  detail: string;
  receivedAt: string;
  attempts: number;
  /** The offending field, when the failure names one. */
  field: string | null;
  payloadPreview: string;
}

const ago = (hours: number): string =>
  new Date(DEMO_NOW.getTime() - hours * HOUR_MS).toISOString();

export const DEAD_LETTER: DeadLetterMessage[] = [
  {
    // Oracle sends its own unit of measure vocabulary; the mapping covers the
    // documented set and this lot arrived in a unit the contract does not name.
    // A replay cannot help — the transform has to learn the unit first.
    id: "dlq_010",
    connectorId: "conn_oracle_scm",
    signalRef: "SIG-2026-08-04-MX-004191",
    reason: "SCHEMA_MISMATCH",
    detail:
      "Unit of measure 'CS' is not in the mapped set. Oracle uses case-pack units at Querétaro that the transform does not yet translate.",
    receivedAt: ago(14),
    attempts: 2,
    field: "unitOfMeasure",
    payloadPreview: '{ "unitOfMeasure": "CS", "quantity": 48, "plantCode": "MX01", … }',
  },
  {
    // A timing failure rather than a contract one: the movement referenced a
    // work order the later run had not yet delivered. This is the case a
    // replay is actually for.
    id: "dlq_011",
    connectorId: "conn_oracle_scm",
    signalRef: "SIG-2026-08-04-IN-004192",
    reason: "MISSING_REFERENCE",
    detail:
      "Goods movement references work order WO-88214, which had not arrived when the movement was processed.",
    receivedAt: ago(6),
    attempts: 1,
    field: "workOrderRef",
    payloadPreview: '{ "workOrderRef": "WO-88214", "plantCode": "IN01", … }',
  },
  {
    id: "dlq_001",
    connectorId: "conn_sap_master",
    signalRef: "SIG-2026-08-04-DE-004188",
    reason: "MISSING_REFERENCE",
    detail: "Material SA-1207 is referenced by the signal but absent from master data.",
    receivedAt: ago(9),
    attempts: 3,
    field: "materialCode",
    payloadPreview: '{ "materialCode": "SA-1207", "plantCode": "DE01", … }',
  },
  {
    id: "dlq_002",
    connectorId: "conn_sap_master",
    signalRef: "SIG-2026-08-04-DE-004189",
    reason: "MISSING_REFERENCE",
    detail: "Supplier V-9902 is not present in the supplier master.",
    receivedAt: ago(9),
    attempts: 3,
    field: "supplierCode",
    payloadPreview: '{ "supplierCode": "V-9902", "plantCode": "DE01", … }',
  },
  {
    id: "dlq_003",
    connectorId: "conn_ea_signals",
    signalRef: "SIG-2026-08-04-MX-004190",
    reason: "VALIDATION_FAILED",
    detail: "revenueAtRisk was negative, which the priority rule set cannot score.",
    receivedAt: ago(14),
    attempts: 2,
    field: "revenueAtRisk",
    payloadPreview: '{ "revenueAtRisk": -4200, "currency": "USD", … }',
  },
  {
    id: "dlq_004",
    connectorId: "conn_ea_signals",
    signalRef: "SIG-2026-08-03-US-004191",
    reason: "DUPLICATE_KEY",
    detail: "This signal reference was already ingested by the preceding run.",
    receivedAt: ago(28),
    attempts: 1,
    field: "signalRef",
    payloadPreview: '{ "signalRef": "SIG-2026-08-03-US-004191", … }',
  },
  {
    id: "dlq_005",
    connectorId: "conn_sap_orders",
    signalRef: "SAP-PO-88214",
    reason: "SCHEMA_MISMATCH",
    detail: "Unexpected column CONFIRMED_QTY_UOM in the order extract.",
    receivedAt: ago(6),
    attempts: 4,
    field: null,
    payloadPreview: '{ "orderRef": "PO-88214", "CONFIRMED_QTY_UOM": "EA", … }',
  },
  {
    id: "dlq_006",
    connectorId: "conn_sap_orders",
    signalRef: "SAP-PO-88219",
    reason: "SCHEMA_MISMATCH",
    detail: "Unexpected column CONFIRMED_QTY_UOM in the order extract.",
    receivedAt: ago(6),
    attempts: 4,
    field: null,
    payloadPreview: '{ "orderRef": "PO-88219", "CONFIRMED_QTY_UOM": "EA", … }',
  },
  {
    id: "dlq_007",
    connectorId: "conn_playbook_monitor",
    signalRef: "PB-REC-2026-0042",
    reason: "DOWNSTREAM_TIMEOUT",
    detail: "Case service did not acknowledge the recurrence event within 30s.",
    receivedAt: ago(19),
    attempts: 2,
    field: null,
    payloadPreview: '{ "playbookId": "pb_vendor_delay", "caseNo": "QO-2026-004151", … }',
  },
];

/* -------------------------------------------------------------- Field mapping */

export interface FieldMapping {
  connectorId: string;
  sourceField: string;
  sourceType: string;
  targetField: string;
  targetType: string;
  required: boolean;
  /** Any transform applied between the two. */
  transform: string | null;
}

export const FIELD_MAPPINGS: FieldMapping[] = [
  // Enterprise Data Platform — Exception Signals
  { connectorId: "conn_ea_signals", sourceField: "SIGNAL_ID", sourceType: "string", targetField: "signalRef", targetType: "string", required: true, transform: null },
  { connectorId: "conn_ea_signals", sourceField: "RULE_ID", sourceType: "string", targetField: "detectionRuleId", targetType: "string", required: true, transform: null },
  { connectorId: "conn_ea_signals", sourceField: "EXCEPTION_CLASS", sourceType: "string", targetField: "exceptionType", targetType: "ExceptionType", required: true, transform: "Mapped through the exception-class lookup" },
  { connectorId: "conn_ea_signals", sourceField: "PLANT", sourceType: "string", targetField: "plantCode", targetType: "string", required: true, transform: null },
  { connectorId: "conn_ea_signals", sourceField: "MATERIAL", sourceType: "string", targetField: "materialCode", targetType: "string | null", required: false, transform: null },
  { connectorId: "conn_ea_signals", sourceField: "EXPOSURE_VALUE", sourceType: "decimal", targetField: "revenueAtRisk", targetType: "number", required: true, transform: "Converted to USD at the daily rate" },
  { connectorId: "conn_ea_signals", sourceField: "KPI_BASELINE", sourceType: "decimal", targetField: "baselineValue", targetType: "number", required: true, transform: null },
  { connectorId: "conn_ea_signals", sourceField: "PROMISED_DATE", sourceType: "date", targetField: "daysToPromisedDate", targetType: "number", required: true, transform: "Difference from ingestion date, in days" },
  { connectorId: "conn_ea_signals", sourceField: "DETECTION_COUNT", sourceType: "integer", targetField: "recurrenceCount", targetType: "number", required: true, transform: null },

  // Enterprise Data Platform — KPI Snapshots
  { connectorId: "conn_ea_kpi", sourceField: "KPI_CODE", sourceType: "string", targetField: "kpiKey", targetType: "KpiKey", required: true, transform: "Mapped through the KPI code lookup" },
  { connectorId: "conn_ea_kpi", sourceField: "SCOPE_LEVEL", sourceType: "string", targetField: "scopeLevel", targetType: "string", required: true, transform: null },
  { connectorId: "conn_ea_kpi", sourceField: "MEASURED_VALUE", sourceType: "decimal", targetField: "value", targetType: "number", required: true, transform: null },
  { connectorId: "conn_ea_kpi", sourceField: "MEASURED_AT", sourceType: "timestamp", targetField: "measuredAt", targetType: "string", required: true, transform: "Normalised to UTC" },

  // Playbook Recurrence Monitor
  { connectorId: "conn_playbook_monitor", sourceField: "playbook_id", sourceType: "string", targetField: "playbookId", targetType: "string", required: true, transform: null },
  { connectorId: "conn_playbook_monitor", sourceField: "origin_case", sourceType: "string", targetField: "caseNo", targetType: "string", required: true, transform: null },
  { connectorId: "conn_playbook_monitor", sourceField: "window_days", sourceType: "integer", targetField: "measurementWindowDays", targetType: "number", required: true, transform: null },

  // SAP master data
  { connectorId: "conn_sap_master", sourceField: "MATNR", sourceType: "CHAR(18)", targetField: "materialCode", targetType: "string", required: true, transform: "Leading zeros stripped" },
  { connectorId: "conn_sap_master", sourceField: "MAKTX", sourceType: "CHAR(40)", targetField: "materialDesc", targetType: "string", required: false, transform: null },
  { connectorId: "conn_sap_master", sourceField: "WERKS", sourceType: "CHAR(4)", targetField: "plantCode", targetType: "string", required: true, transform: null },
  { connectorId: "conn_sap_master", sourceField: "LIFNR", sourceType: "CHAR(10)", targetField: "supplierCode", targetType: "string | null", required: false, transform: "Leading zeros stripped" },
  { connectorId: "conn_sap_master", sourceField: "NAME1", sourceType: "CHAR(35)", targetField: "supplierName", targetType: "string | null", required: false, transform: null },

  // SAP orders
  { connectorId: "conn_oracle_scm", sourceField: "WO_HEADER_ID", sourceType: "NUMBER", targetField: "workOrderRef", targetType: "string", required: true, transform: "Prefixed WO-" },
  { connectorId: "conn_oracle_scm", sourceField: "ORGANIZATION_CODE", sourceType: "VARCHAR2(18)", targetField: "plantCode", targetType: "string", required: true, transform: "Org to plant lookup" },
  { connectorId: "conn_oracle_scm", sourceField: "UOM_CODE", sourceType: "VARCHAR2(3)", targetField: "unitOfMeasure", targetType: "string", required: true, transform: "Oracle UOM to ISO" },
  { connectorId: "conn_oracle_scm", sourceField: "TRANSACTION_DATE", sourceType: "DATE", targetField: "movedAt", targetType: "string", required: true, transform: "Local to UTC" },
  { connectorId: "conn_sap_orders", sourceField: "EBELN", sourceType: "CHAR(10)", targetField: "orderRef", targetType: "string", required: true, transform: "Prefixed PO-" },
  { connectorId: "conn_sap_orders", sourceField: "EINDT", sourceType: "DATS", targetField: "promisedDate", targetType: "string", required: true, transform: "YYYYMMDD to ISO" },
  { connectorId: "conn_sap_orders", sourceField: "KUNNR", sourceType: "CHAR(10)", targetField: "customerCode", targetType: "string | null", required: false, transform: "Leading zeros stripped" },
  { connectorId: "conn_sap_orders", sourceField: "NETWR", sourceType: "CURR(15,2)", targetField: "revenueAtRisk", targetType: "number", required: true, transform: "Converted to USD" },

  // Outbound notifications
  { connectorId: "conn_outbound_notify", sourceField: "ownerId", sourceType: "string", targetField: "recipient", targetType: "string", required: true, transform: "Resolved to the user's email" },
  { connectorId: "conn_outbound_notify", sourceField: "eventKind", sourceType: "CaseEventKind", targetField: "templateId", targetType: "string", required: true, transform: "Mapped through the notification template lookup" },
];

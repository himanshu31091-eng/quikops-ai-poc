import { format } from "date-fns";
import { CONNECTOR_STATUS_META } from "@/src/domain/connector-health";
import type { ConnectorRun } from "@/src/data/fixtures/connectors";
import { buildCsv, exportSectionsCsv, type CsvColumn } from "@/src/lib/export";
import type { ConnectorHealthModel, DeadLetterRow } from "../types";

/**
 * Exports what the operator is looking at — the visible connectors, the
 * filtered run history and the dead-letter queue in its current state.
 *
 * Three sections rather than three files: the question this module answers is
 * "is ingestion healthy", and the answer needs the runs and the failures side
 * by side. Escaping, filename and download come from `src/lib/export`, so this
 * file is column definitions and nothing else.
 */

const TIMESTAMP_FORMAT = "yyyy-MM-dd HH:mm";

const CONNECTOR_COLUMNS: CsvColumn<ConnectorHealthModel["visibleConnectors"][number]>[] = [
  { header: "Connector", value: (row) => row.name },
  { header: "System", value: (row) => row.system },
  { header: "Direction", value: (row) => row.direction },
  { header: "Last status", value: (row) => CONNECTOR_STATUS_META[row.lastStatus].label },
  { header: "Owner team", value: (row) => row.ownerTeam },
  { header: "Health score", value: (row) => String(row.health.score) },
  { header: "Health band", value: (row) => row.health.band },
  { header: "Success rate %", value: (row) => String(row.health.successRatePct) },
  { header: "Records processed", value: (row) => String(row.recordsProcessed) },
  { header: "Records failed", value: (row) => String(row.recordsFailed) },
  { header: "Cases raised", value: (row) => String(row.casesRaised) },
  { header: "Dead letters", value: (row) => String(row.deadLetterDepth) },
  {
    header: "Minutes since last run",
    value: (row) => String(row.health.minutesSinceLastRun),
  },
];

const RUN_COLUMNS: CsvColumn<ConnectorRun>[] = [
  { header: "Started", value: (row) => format(new Date(row.startedAt), TIMESTAMP_FORMAT) },
  { header: "Connector", value: (row) => row.connectorId },
  { header: "Status", value: (row) => CONNECTOR_STATUS_META[row.status].label },
  { header: "Duration (s)", value: (row) => String(row.durationSeconds) },
  { header: "Received", value: (row) => String(row.recordsReceived) },
  { header: "Processed", value: (row) => String(row.recordsProcessed) },
  { header: "Deduplicated", value: (row) => String(row.recordsDeduplicated) },
  { header: "Failed", value: (row) => String(row.recordsFailed) },
  { header: "Cases raised", value: (row) => String(row.casesRaised) },
  { header: "Message", value: (row) => row.message },
];

const DEAD_LETTER_COLUMNS: CsvColumn<DeadLetterRow>[] = [
  { header: "Reference", value: (row) => row.signalRef },
  { header: "Connector", value: (row) => row.connectorName },
  { header: "Reason", value: (row) => row.reasonLabel },
  { header: "Detail", value: (row) => row.detail },
  { header: "Field", value: (row) => row.field ?? "" },
  { header: "Received", value: (row) => format(new Date(row.receivedAt), TIMESTAMP_FORMAT) },
  { header: "Attempts", value: (row) => String(row.attempts) },
  {
    header: "State",
    value: (row) =>
      row.isReplayed ? "Replayed this session" : row.isUnreplayable ? "Not replayable" : "Open",
  },
];

/** Returns the filename, for the confirmation toast. */
export function exportConnectorHealth(
  model: ConnectorHealthModel,
  runs: ConnectorRun[],
): string {
  return exportSectionsCsv(
    "connector-health",
    model.isFiltered ? "Connector Health — filtered view" : "Connector Health",
    [
      { title: "Connectors", csv: buildCsv(model.visibleConnectors, CONNECTOR_COLUMNS) },
      { title: "Run history", csv: buildCsv(runs, RUN_COLUMNS) },
      { title: "Dead-letter queue", csv: buildCsv(model.deadLetter, DEAD_LETTER_COLUMNS) },
    ],
  );
}

import { format } from "date-fns";
import { ACTION_STATUS_META, PRIORITY_META } from "@/src/config/app-config";
import { ACTION_SLA_META } from "@/src/domain/action-sla";
import { DEMO_NOW } from "@/src/lib/constants";
import { buildCsv, downloadCsv, type CsvColumn } from "@/src/lib/csv";
import type { ActionRow } from "../types";

/**
 * Exports exactly what the manager is looking at — the filtered, sorted queue,
 * in the column order of the table. An export that silently returns everything
 * is worse than no export at all.
 */

const DATE_FORMAT = "yyyy-MM-dd";

const COLUMNS: CsvColumn<ActionRow>[] = [
  { header: "Action ID", value: (row) => row.id },
  { header: "Priority", value: (row) => PRIORITY_META[row.priorityBand].label },
  { header: "Case ID", value: (row) => row.caseNo },
  { header: "Case", value: (row) => row.caseTitle },
  { header: "Action", value: (row) => row.title },
  { header: "Description", value: (row) => row.description },
  { header: "Owner", value: (row) => row.ownerName },
  { header: "Due date", value: (row) => format(new Date(row.dueAt), DATE_FORMAT) },
  { header: "SLA", value: (row) => ACTION_SLA_META[row.slaState].label },
  { header: "Overdue", value: (row) => (row.isOverdue ? "Yes" : "No") },
  { header: "Status", value: (row) => ACTION_STATUS_META[row.status].label },
  { header: "Progress %", value: (row) => String(row.completionPct) },
  { header: "Origin", value: (row) => row.origin },
  { header: "Plant", value: (row) => row.context.plantName },
  { header: "Exception type", value: (row) => row.context.exceptionLabel },
  { header: "Revenue at risk", value: (row) => String(row.context.revenueAtRisk) },
  { header: "Supplier", value: (row) => row.context.supplierName ?? "" },
  { header: "Customer", value: (row) => row.context.customerName ?? "" },
  {
    header: "Completed",
    value: (row) =>
      row.completedAt === null ? "" : format(new Date(row.completedAt), DATE_FORMAT),
  },
];

export function buildActionsCsv(rows: ActionRow[]): string {
  return buildCsv(rows, COLUMNS);
}

export function exportActionsCsv(rows: ActionRow[]): string {
  return downloadCsv(
    `quikops-action-center-${format(DEMO_NOW, DATE_FORMAT)}.csv`,
    buildActionsCsv(rows),
  );
}

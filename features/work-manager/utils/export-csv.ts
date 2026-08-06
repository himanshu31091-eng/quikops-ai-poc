import { format } from "date-fns";
import { DETECTION_SOURCE_META, EXCEPTION_META, PRIORITY_META } from "@/src/config/app-config";
import { STATUS_GROUP_META } from "@/src/domain/case-status";
import { DEMO_NOW } from "@/src/lib/constants";
import { buildCsv, downloadCsv, type CsvColumn } from "@/src/lib/csv";
import type { WorkCaseRow } from "../types";

/**
 * Exports exactly what the manager is looking at — the filtered, sorted set, in
 * the column order of the table. An export that silently returns everything is
 * worse than no export at all.
 *
 * The columns are the Work Manager's own; the escaping and download live in
 * `src/lib/csv` so Analytics can reuse them without importing from this feature.
 */

const DATE_FORMAT = "yyyy-MM-dd";

const COLUMNS: CsvColumn<WorkCaseRow>[] = [
  { header: "Case ID", value: (row) => row.caseNo },
  { header: "Title", value: (row) => row.title },
  { header: "Plant code", value: (row) => row.plantCode },
  { header: "Plant", value: (row) => row.plant.name },
  { header: "Category", value: (row) => EXCEPTION_META[row.exceptionType].label },
  { header: "Priority", value: (row) => PRIORITY_META[row.priorityBand].label },
  { header: "Priority score", value: (row) => row.priorityScore.toFixed(1) },
  { header: "Status", value: (row) => STATUS_GROUP_META[row.statusGroup].label },
  { header: "Owner", value: (row) => row.owner?.name ?? "Unassigned" },
  { header: "Revenue at risk", value: (row) => String(row.revenueAtRisk) },
  { header: "Currency", value: (row) => row.currency },
  { header: "Due date", value: (row) => format(new Date(row.dueAt), DATE_FORMAT) },
  { header: "Overdue", value: (row) => (row.isOverdue ? "Yes" : "No") },
  { header: "Age (days)", value: (row) => String(row.ageDays) },
  {
    header: "Last detected",
    value: (row) => format(new Date(row.lastDetectedAt), DATE_FORMAT),
  },
  { header: "Detected by", value: (row) => DETECTION_SOURCE_META[row.detectedBy].label },
  { header: "Detections", value: (row) => String(row.recurrenceCount) },
  { header: "Material", value: (row) => row.materialCode ?? "" },
  { header: "Supplier", value: (row) => row.supplierName ?? "" },
  { header: "Customer", value: (row) => row.customerName ?? "" },
  { header: "Open actions", value: (row) => String(row.openActionCount) },
];

export function buildCasesCsv(rows: WorkCaseRow[]): string {
  return buildCsv(rows, COLUMNS);
}

export function exportCasesCsv(rows: WorkCaseRow[]): string {
  return downloadCsv(
    `quikops-work-manager-${format(DEMO_NOW, DATE_FORMAT)}.csv`,
    buildCasesCsv(rows),
  );
}

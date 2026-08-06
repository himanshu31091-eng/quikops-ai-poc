import { format } from "date-fns";
import { DETECTION_SOURCE_META, EXCEPTION_META, PRIORITY_META } from "@/src/config/app-config";
import { STATUS_GROUP_META } from "@/src/domain/case-status";
import { DEMO_NOW } from "@/src/lib/constants";
import type { WorkCaseRow } from "../types";

/**
 * Exports exactly what the manager is looking at — the filtered, sorted set, in
 * the column order of the table. An export that silently returns everything is
 * worse than no export at all.
 */

interface Column {
  header: string;
  value: (row: WorkCaseRow) => string;
}

const DATE_FORMAT = "yyyy-MM-dd";

const COLUMNS: Column[] = [
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

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCasesCsv(rows: WorkCaseRow[]): string {
  const lines = [COLUMNS.map((column) => escapeCell(column.header)).join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => escapeCell(column.value(row))).join(","));
  }
  return lines.join("\r\n");
}

export function exportCasesCsv(rows: WorkCaseRow[]): string {
  const filename = `quikops-work-manager-${format(DEMO_NOW, DATE_FORMAT)}.csv`;
  // BOM so Excel opens UTF-8 plant and supplier names correctly.
  const blob = new Blob([`﻿${buildCasesCsv(rows)}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}

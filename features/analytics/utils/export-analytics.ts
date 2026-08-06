import { format } from "date-fns";
import { DEMO_NOW } from "@/src/lib/constants";
import { buildCsv, buildCsvSections, downloadCsv, type CsvColumn } from "@/src/lib/csv";
import { formatHours } from "@/src/lib/format";
import type {
  AnalyticsModel,
  CategoryDatum,
  PersonPerformanceRow,
  PlantPerformanceRow,
  WeeklyDatum,
} from "../types";

/**
 * Exports the analytics view as one sheet of labelled sections.
 *
 * Aggregates, not the raw case list — the Work Manager already exports cases,
 * and a manager asking Analytics for an export wants the numbers they are
 * looking at. Every section reflects the current filters, because an export
 * that silently returns everything is worse than no export at all.
 */

const DATE_FORMAT = "yyyy-MM-dd";

const hours = (value: number | null): string =>
  value === null ? "" : formatHours(value);
const pct = (value: number): string => value.toFixed(1);

const KPI_COLUMNS: CsvColumn<AnalyticsModel["kpis"][number]>[] = [
  { header: "Metric", value: (row) => row.label },
  { header: "Value", value: (row) => row.display },
  { header: "Change vs portfolio", value: (row) => String(row.deltaValue) },
  { header: "Unit", value: (row) => row.deltaUnit },
  { header: "Note", value: (row) => row.footnote },
];

const CATEGORY_COLUMNS: CsvColumn<CategoryDatum>[] = [
  { header: "Category", value: (row) => row.label },
  { header: "Cases", value: (row) => String(row.count) },
  { header: "Revenue at risk", value: (row) => String(row.revenueAtRisk) },
];

const PLANT_COLUMNS: CsvColumn<PlantPerformanceRow>[] = [
  { header: "Plant code", value: (row) => row.plantCode },
  { header: "Plant", value: (row) => row.plantName },
  { header: "Country", value: (row) => row.country },
  { header: "Total cases", value: (row) => String(row.totalCases) },
  { header: "Open cases", value: (row) => String(row.openCases) },
  { header: "Past SLA", value: (row) => String(row.breached) },
  { header: "SLA adherence %", value: (row) => pct(row.slaAdherencePct) },
  { header: "Avg resolution", value: (row) => hours(row.avgResolutionHours) },
  { header: "Revenue at risk", value: (row) => String(row.revenueAtRisk) },
  { header: "Score", value: (row) => String(row.score) },
];

const PERSON_COLUMNS: CsvColumn<PersonPerformanceRow>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Role", value: (row) => row.roleLabel },
  { header: "Job title", value: (row) => row.jobTitle },
  { header: "Cases", value: (row) => String(row.assigned) },
  { header: "Resolved", value: (row) => String(row.resolved) },
  { header: "Open", value: (row) => String(row.open) },
  { header: "Past SLA", value: (row) => String(row.breached) },
  { header: "SLA adherence %", value: (row) => pct(row.slaAdherencePct) },
  { header: "Avg resolution", value: (row) => hours(row.avgResolutionHours) },
  { header: "Revenue at risk", value: (row) => String(row.revenueAtRisk) },
];

const WEEKLY_COLUMNS: CsvColumn<WeeklyDatum>[] = [
  { header: "Week", value: (row) => row.week },
  { header: "Opened", value: (row) => String(row.opened) },
  { header: "Closed", value: (row) => String(row.closed) },
];

export function buildAnalyticsCsv(model: AnalyticsModel, scope: string): string {
  return buildCsvSections([
    { title: `QuikOps AI — Execution Analytics — ${scope}`, csv: "" },
    { title: "Headline metrics", csv: buildCsv(model.kpis, KPI_COLUMNS) },
    { title: "Cases by priority", csv: buildCsv(model.byPriority, CATEGORY_COLUMNS) },
    { title: "Cases by plant", csv: buildCsv(model.byPlant, CATEGORY_COLUMNS) },
    { title: "Cases by exception type", csv: buildCsv(model.byException, CATEGORY_COLUMNS) },
    { title: "Weekly throughput", csv: buildCsv(model.weekly, WEEKLY_COLUMNS) },
    {
      title: "Plant performance",
      csv: buildCsv([...model.topPlants, ...model.bottomPlants], PLANT_COLUMNS),
    },
    { title: "Owner performance", csv: buildCsv(model.owners, PERSON_COLUMNS) },
    { title: "Reviewer performance", csv: buildCsv(model.reviewers, PERSON_COLUMNS) },
  ]);
}

export function exportAnalyticsCsv(model: AnalyticsModel, scope: string): string {
  return downloadCsv(
    `quikops-execution-analytics-${format(DEMO_NOW, DATE_FORMAT)}.csv`,
    buildAnalyticsCsv(model, scope),
  );
}

/**
 * PDF export via the browser's own print pipeline.
 *
 * Deliberately not a PDF library: every renderer worth using is 300kB+ and
 * would have to re-implement the charts to draw them. `print:` variants on the
 * page hide the shell and expand the grid, and every browser's print dialog
 * offers "Save as PDF" — which is what a manager actually does with a report.
 */
export function exportAnalyticsPdf(): void {
  window.print();
}

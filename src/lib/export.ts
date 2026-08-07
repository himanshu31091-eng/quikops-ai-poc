import { format } from "date-fns";
import { DEMO_NOW } from "./constants";
import { buildCsv, buildCsvSections, downloadCsv, type CsvColumn } from "./csv";
import { buildWorkbook, downloadWorkbook, sheet, type XlsSheet } from "./xlsx";

/**
 * The export framework.
 *
 * Four modules export tabular data and three export a composed report. They all
 * previously assembled their own filename, decided their own CSV escaping and
 * reached for `window.print()` directly. This owns the filename convention, the
 * two output formats, and the rule that an export reflects the current view.
 *
 * PDF goes through the browser's print pipeline rather than a library — see
 * D-44. Every renderer worth using is 300kB+ and would have to redraw the
 * charts; every browser's print dialog offers "Save as PDF", which is what a
 * manager does with a report anyway.
 */

const DATE_FORMAT = "yyyy-MM-dd";

export type ExportFormat = "csv" | "xls" | "pdf";

/** `quikops-action-center-2026-08-06.csv` — module, date, extension. */
export function exportFilename(moduleSlug: string, extension: string): string {
  return `quikops-${moduleSlug}-${format(DEMO_NOW, DATE_FORMAT)}.${extension}`;
}

export interface TableExport<TRow> {
  moduleSlug: string;
  rows: TRow[];
  columns: CsvColumn<TRow>[];
}

/** Exports one flat table. Returns the filename, for the confirmation toast. */
export function exportTableCsv<TRow>({
  moduleSlug,
  rows,
  columns,
}: TableExport<TRow>): string {
  return downloadCsv(exportFilename(moduleSlug, "csv"), buildCsv(rows, columns));
}

/**
 * Exports several labelled tables as one sheet. Analytics and Reports export
 * aggregates rather than a single table, and one file a manager can open beats
 * four they have to reconcile.
 */
export function exportSectionsCsv(
  moduleSlug: string,
  scopeLabel: string,
  sections: { title: string; csv: string }[],
): string {
  return downloadCsv(
    exportFilename(moduleSlug, "csv"),
    buildCsvSections([
      { title: `QuikOps AI — ${scopeLabel}`, csv: "" },
      ...sections,
    ]),
  );
}

/**
 * Opens the print dialog for a PDF.
 *
 * The page decides what prints, via `print:hidden` on its controls — there is
 * no separate print view to keep in sync with the real one.
 */
export function exportPdf(): void {
  if (typeof window === "undefined") return;
  window.print();
}

/**
 * Exports one or more sheets as a real workbook.
 *
 * Distinct from the CSV path rather than replacing it: a CSV is the right
 * answer when the destination is another system, and a workbook is the right
 * answer when the destination is a person. The difference that matters is
 * typing — Excel guesses at a CSV, and a material code with a leading zero or a
 * date in the wrong locale is guessed wrong.
 *
 * Returns the filename, for the confirmation toast.
 */
export function exportWorkbook(
  moduleSlug: string,
  sheets: XlsSheet<never>[],
): string {
  return downloadWorkbook(
    exportFilename(moduleSlug, "xls"),
    buildWorkbook(sheets),
  );
}

export { sheet };
export type { CsvColumn, XlsSheet };
export { buildCsv, buildCsvSections };

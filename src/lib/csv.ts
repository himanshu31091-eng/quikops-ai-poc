/**
 * CSV assembly and download.
 *
 * Lives here rather than in a feature because two modules export tabular data —
 * the Work Manager exports the filtered case queue, Execution Analytics exports
 * its aggregates. The column definitions stay with each feature; only the
 * escaping and the browser download live here.
 *
 * Same reasoning as `caseHref`: a helper that lives inside one feature is a
 * helper the next feature re-implements badly.
 */

/** A column definition over an arbitrary row shape. */
export interface CsvColumn<TRow> {
  header: string;
  value: (row: TRow) => string;
}

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCsv<TRow>(rows: TRow[], columns: CsvColumn<TRow>[]): string {
  const lines = [columns.map((column) => escapeCell(column.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCell(column.value(row))).join(","));
  }
  return lines.join("\r\n");
}

/**
 * Joins several labelled tables into one sheet, separated by a blank line.
 * Analytics exports aggregates rather than a single flat table, and one file a
 * manager can open beats four files they have to reconcile.
 */
export function buildCsvSections(
  sections: { title: string; csv: string }[],
): string {
  return sections
    .map((section) => `${escapeCell(section.title)}\r\n${section.csv}`)
    .join("\r\n\r\n");
}

/** Triggers a browser download. Returns the filename for the confirmation toast. */
export function downloadCsv(filename: string, csv: string): string {
  // BOM so Excel opens UTF-8 plant and supplier names correctly.
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
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

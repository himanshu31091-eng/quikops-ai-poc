"use client";

import * as React from "react";
import type { ReportSection } from "@/src/data/fixtures/reports";

/**
 * Saved reports.
 *
 * A template plus the sections a manager actually kept is a different artefact
 * from the template alone — it is the report *they* send, and rebuilding the
 * section picker every month is the kind of small friction that stops a report
 * being sent at all.
 *
 * Persisted in `localStorage` alongside tour completion (D-60) and tip
 * dismissals (D-78). That is now the third and final thing this product keeps
 * locally, and the reason is the same in all three: state that belongs to a
 * person's habits rather than to the operation.
 *
 * Read after hydration, never during it — a `localStorage` read in the first
 * render makes the server and client markup disagree, and every fix for that is
 * worse than one frame of an empty list.
 */

const STORAGE_KEY = "qo.savedReports";
const MAX_SAVED = 12;

export interface SavedReport {
  id: string;
  name: string;
  templateId: string;
  sections: ReportSection[];
  /** ISO timestamp, supplied by the caller so nothing here calls `new Date()`. */
  savedAt: string;
}

export interface SavedReportsApi {
  /** False until storage has been read, so nothing flashes. */
  isReady: boolean;
  reports: SavedReport[];
  save: (input: {
    name: string;
    templateId: string;
    sections: ReportSection[];
    savedAt: string;
  }) => SavedReport | null;
  remove: (id: string) => void;
}

function read(): SavedReport[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validated rather than trusted: this is user-writable storage, and a
    // hand-edited entry should degrade to "not there" rather than to a crash on
    // the first render of the Reports screen.
    return parsed.filter(
      (entry): entry is SavedReport =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as SavedReport).id === "string" &&
        typeof (entry as SavedReport).name === "string" &&
        typeof (entry as SavedReport).templateId === "string" &&
        Array.isArray((entry as SavedReport).sections),
    );
  } catch {
    return [];
  }
}

function write(reports: SavedReport[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Private browsing, or the quota is full. The list still holds for this
    // session; there is nothing useful to tell the user about it.
  }
}

export function useSavedReports(): SavedReportsApi {
  const [isReady, setIsReady] = React.useState(false);
  const [reports, setReports] = React.useState<SavedReport[]>([]);

  React.useEffect(() => {
    setReports(read());
    setIsReady(true);
  }, []);

  const save = React.useCallback(
    (input: {
      name: string;
      templateId: string;
      sections: ReportSection[];
      savedAt: string;
    }): SavedReport | null => {
      const name = input.name.trim();
      if (name === "") return null;

      const entry: SavedReport = {
        // Name-derived rather than random: saving the same report twice should
        // update it rather than accumulate near-duplicates a reader has to tell
        // apart by timestamp.
        id: `saved_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        templateId: input.templateId,
        sections: input.sections,
        savedAt: input.savedAt,
      };

      let saved: SavedReport = entry;
      setReports((current) => {
        const without = current.filter((report) => report.id !== entry.id);
        const next = [entry, ...without].slice(0, MAX_SAVED);
        write(next);
        saved = entry;
        return next;
      });
      return saved;
    },
    [],
  );

  const remove = React.useCallback((id: string) => {
    setReports((current) => {
      const next = current.filter((report) => report.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { isReady, reports, save, remove };
}

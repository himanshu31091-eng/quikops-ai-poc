"use client";

import * as React from "react";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { FIELD_CLASS } from "@/components/patterns/form-field";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatWhen } from "@/src/lib/format";
import type { SavedReport } from "../hooks/use-saved-reports";

/**
 * The reports a manager actually sends.
 *
 * Saving captures the template *and* the section selection, because those two
 * together are the artefact — a template alone is where you start, not what you
 * send. Applying one restores both in a single click.
 *
 * The save control is a form rather than a prompt: an inline field can be
 * reached by keyboard, read by a screen reader and cancelled with Escape, none
 * of which is true of `window.prompt`.
 */
export function SavedReportsPanel({
  reports,
  isReady,
  currentTemplateName,
  sectionCount,
  onSave,
  onApply,
  onRemove,
  templateNameFor,
}: {
  reports: SavedReport[];
  isReady: boolean;
  currentTemplateName: string | null;
  sectionCount: number;
  onSave: (name: string) => void;
  onApply: (report: SavedReport) => void;
  onRemove: (id: string) => void;
  templateNameFor: (templateId: string) => string;
}) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const [name, setName] = React.useState("");
  const [isNaming, setIsNaming] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isNaming) inputRef.current?.focus();
  }, [isNaming]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") return;
    onSave(trimmed);
    setName("");
    setIsNaming(false);
  };

  return (
    <div className="space-y-3">
      {isNaming ? (
        <form onSubmit={submit} className="space-y-2">
          <label
            htmlFor="saved-report-name"
            className="block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
          >
            {t("reports.nameThisReport")}
          </label>
          <input
            id="saved-report-name"
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsNaming(false);
                setName("");
              }
            }}
            placeholder={t("reports.monthlyBoardPack")}
            className={FIELD_CLASS}
          />
          <p className="text-2xs text-content-tertiary">
            Saves {currentTemplateName ?? "the current template"} with{" "}
            {sectionCount} section{sectionCount === 1 ? "" : "s"} selected.
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="primary" size="sm" type="submit" disabled={name.trim() === ""}>
              <Icon name="Check" size="sm" />
              {t("common.save")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setIsNaming(false);
                setName("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsNaming(true)}
          disabled={currentTemplateName === null}
          className="w-full"
        >
          <Icon name="Plus" size="sm" />
          {t("reports.saveTheCurrentSelection")}
        </Button>
      )}

      {!isReady ? null : reports.length === 0 ? (
        <EmptyState
          icon="BookMarked"
          size="sm"
          title={t("reports.nothingSavedYet")}
          description={t("reports.pickATemplateChooseThe")}
        />
      ) : (
        <ul className="space-y-1.5">
          {reports.map((report) => (
            <li
              key={report.id}
              className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-2"
            >
              <button
                type="button"
                onClick={() => onApply(report)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-xs font-medium text-content">
                  {report.name}
                </span>
                <span className="block truncate text-2xs text-content-tertiary">
                  {templateNameFor(report.templateId)} · {report.sections.length} section
                  {report.sections.length === 1 ? "" : "s"} ·{" "}
                  {formatWhen(report.savedAt, DEMO_NOW, fmt)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onRemove(report.id)}
                aria-label={`Delete saved report: ${report.name}`}
                className="shrink-0 rounded-md p-1 text-content-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-critical-content"
              >
                <Icon name="Trash2" size="xs" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-px shrink-0" />
        Saved in this browser. Sharing a saved report across a team needs the
        Phase-2 persistence layer.
      </p>
    </div>
  );
}

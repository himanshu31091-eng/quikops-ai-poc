"use client";

import { upload } from "@vercel/blob/client";
import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import type { CaseEvidence, CorrectiveAction } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { useTranslation } from "@/src/i18n/provider";
import type { EvidenceDraft } from "../types";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED_EXTENSIONS,
  EVIDENCE_META,
  evidenceKindOf,
  formatBytes,
} from "../utils/evidence";
import { FIELD_CLASS, recentClass, SectionEmpty } from "./primitives";

interface EvidenceCardProps {
  evidence: CaseEvidence[];
  actions: CorrectiveAction[];
  readOnly: boolean;
  recentIds: Set<string>;
  onAdd: (drafts: EvidenceDraft[]) => void;
  onRemove: (id: string) => void;
  /** Set by the parent so the header's Upload evidence button can focus the zone. */
  dropZoneRef: React.RefObject<HTMLDivElement | null>;
  /** The case these files are filed against — sent to the upload authoriser. */
  caseNo: string;
  /** True when uploads go to blob storage rather than living in this tab. */
  persistent: boolean;
}

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Evidence is what turns a claim into a verifiable outcome, so the locker is
 * strict about two things: the file type must be one a reviewer can open, and
 * every file records who attached it and against which action.
 *
 * Files upload straight from the browser to private blob storage, authorised
 * by a route that checks the session and the case first. The object URL below
 * is only the instant preview while that happens — never the storage.
 */
export const EvidenceCard = React.memo(function EvidenceCard({
  evidence,
  actions,
  readOnly,
  recentIds,
  onAdd,
  onRemove,
  dropZoneRef,
  caseNo,
  persistent,
}: EvidenceCardProps) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [rejected, setRejected] = React.useState<string[]>([]);
  const [linkedAction, setLinkedAction] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [noteMode, setNoteMode] = React.useState(false);
  const [note, setNote] = React.useState("");

  const accept = React.useCallback(
    async (files: FileList | File[]) => {
      const drafts: EvidenceDraft[] = [];
      const problems: string[] = [];

      for (const file of Array.from(files)) {
        const kind = evidenceKindOf(file.name);
        if (!kind) {
          problems.push(`${file.name} — unsupported file type`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          problems.push(`${file.name} — over the 25 MB limit`);
          continue;
        }

        const draft: EvidenceDraft = {
          fileName: file.name,
          kind,
          sizeBytes: file.size,
          description:
            description.trim() ||
            "Attached from the case detail screen. No description recorded.",
          actionId: linkedAction === "" ? null : linkedAction,
          ...(kind === "IMAGE" ? { objectUrl: URL.createObjectURL(file) } : {}),
        };

        /* The file goes straight from here to private blob storage. The route
         * that authorises it checks the session and that the case belongs to
         * this tenant before any token exists, and the bytes never pass
         * through a Server Action — which is what makes the 25 MB limit above
         * honest rather than aspirational.
         *
         * When storage is not configured the upload fails and the evidence is
         * still recorded, as metadata. That is the pre-existing behaviour and
         * it is the honest one: the record of who filed what, and what it
         * proves, is worth keeping even when the file could not be stored. */
        if (persistent) {
          try {
            const uploaded = await upload(`evidence/${caseNo}/${file.name}`, file, {
              access: "private",
              handleUploadUrl: "/api/evidence/upload",
              clientPayload: caseNo,
            });
            draft.storageUrl = uploaded.url;
            draft.storagePath = uploaded.pathname;
          } catch {
            problems.push(`${file.name} — stored as a record only; the file could not be uploaded`);
          }
        }

        drafts.push(draft);
      }

      setRejected(problems);
      if (drafts.length > 0) {
        onAdd(drafts);
        setDescription("");
      }
    },
    [description, linkedAction, onAdd, persistent, caseNo],
  );

  const submitNote = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length < 4) return;
    onAdd([
      {
        fileName: `${trimmed.slice(0, 40).replace(/[^\w\s-]/g, "").trim() || "case-note"}.txt`,
        kind: "NOTE",
        sizeBytes: new Blob([trimmed]).size,
        description: trimmed,
        actionId: linkedAction === "" ? null : linkedAction,
      },
    ]);
    setNote("");
    setNoteMode(false);
  };

  return (
    <SectionCard
      title="Evidence"
      subtitle={`${evidence.length} file${evidence.length === 1 ? "" : "s"} on the case`}
      icon="Paperclip"
      flush
      action={
        !readOnly ? (
          <Button variant="secondary" size="sm" onClick={() => setNoteMode((prev) => !prev)}>
            <Icon name="StickyNote" size="sm" />
            {noteMode ? "Cancel note" : "Add note"}
          </Button>
        ) : null
      }
      footer={
        <p className="flex items-center gap-1.5 text-2xs text-content-tertiary">
          <Icon name="Info" size="xs" />
          {persistent
            ? "Files are stored privately and can only be opened from this case by someone in your organisation."
            : "Files attached in this session are held in the browser. Turning on the database stores them durably."}
        </p>
      }
    >
      {!readOnly ? (
        <div className="border-b border-line px-4 py-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="evidence-action"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                File against
              </label>
              <select
                id="evidence-action"
                value={linkedAction}
                onChange={(event) => setLinkedAction(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">The case as a whole</option>
                {actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="evidence-description"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                What this proves
              </label>
              <input
                id="evidence-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Written confirmation of the revised date"
                className={FIELD_CLASS}
              />
            </div>
          </div>

          {noteMode ? (
            <form onSubmit={submitNote} className="mt-3">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                autoFocus
                aria-label="Evidence note"
                placeholder="Record what was observed, measured or agreed — dates, quantities, who said it."
                className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
              />
              <div className="mt-2 flex justify-end">
                <Button variant="primary" size="sm" type="submit" disabled={note.trim().length < 4}>
                  <Icon name="Plus" size="sm" />
                  Attach note
                </Button>
              </div>
            </form>
          ) : (
            <div
              ref={dropZoneRef}
              tabIndex={-1}
              onDragOver={(event) => {
                event.preventDefault();
                if (!dragging) setDragging(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (event.dataTransfer.files.length > 0) accept(event.dataTransfer.files);
              }}
              className={cn(
                "mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors duration-150",
                dragging
                  ? "border-accent bg-accent-subtle"
                  : "border-line-strong bg-surface-subtle",
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border transition-colors duration-150",
                  dragging
                    ? "border-accent-line bg-surface text-accent"
                    : "border-line bg-surface text-content-tertiary",
                )}
              >
                <Icon name="Upload" size="md" />
              </span>
              <p className="mt-2.5 text-sm font-medium text-content">
                {dragging ? "Drop to attach" : "Drag files here"}
              </p>
              <p className="mt-1 text-2xs text-content-tertiary">
                Images, PDF, Excel and documents up to 25 MB
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => inputRef.current?.click()}
              >
                <Icon name="Paperclip" size="sm" />
                Browse files
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                // Visually hidden but still focusable, so it needs a name of
                // its own — the Browse button beside it is not its label.
                aria-label="Attach evidence files"
                accept={ACCEPT_ATTRIBUTE}
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) accept(event.target.files);
                  event.target.value = "";
                }}
              />
              <p className="mt-2 text-2xs text-content-tertiary">
                {ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(" · ")}
              </p>
            </div>
          )}

          {rejected.length > 0 ? (
            <ul className="mt-2.5 space-y-1 rounded-md border border-critical-line bg-critical-subtle px-3 py-2">
              {rejected.map((problem) => (
                <li
                  key={problem}
                  className="flex items-center gap-1.5 text-2xs font-medium text-critical-content"
                >
                  <Icon name="CircleAlert" size="xs" />
                  {problem}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {evidence.length === 0 ? (
        <SectionEmpty
          icon="Paperclip"
          title="No evidence attached"
          description="Verification needs proof. Attach the confirmations, measurements and reports that show the corrective actions actually landed."
        />
      ) : (
        <ul className="divide-y divide-line">
          {evidence.map((file) => {
            const meta = EVIDENCE_META[file.kind];
            const action = actions.find((entry) => entry.id === file.actionId);

            return (
              <li
                key={file.id}
                className={cn(
                  "group flex items-start gap-3 px-4 py-3 hover:bg-surface-subtle",
                  recentIds.has(file.id) ? "anim-settle" : "",
                  recentClass(recentIds.has(file.id)),
                )}
              >
                {file.objectUrl ? (
                  // A blob URL from this session, not a served asset — 
                  // cannot optimise one, and the alt is empty because the file
                  // name sits beside it and would otherwise be read twice.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.objectUrl}
                    alt=""
                    className="size-10 shrink-0 rounded-md border border-line object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md border",
                      meta.className,
                    )}
                  >
                    <Icon name={meta.icon} size="md" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="truncate text-sm font-medium text-content">{file.fileName}</p>
                    <span className="rounded-sm border border-line bg-surface-subtle px-1 py-px text-2xs text-content-tertiary">
                      {meta.label}
                    </span>
                    {file.accepted ? (
                      <span className="flex items-center gap-1 text-2xs font-medium text-success-content">
                        <Icon name="CircleCheck" size="xs" />
                        Accepted
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                    {file.description}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-content-tertiary">
                    <span title={formatTimestamp(file.uploadedAt)}>
                      {file.uploadedByName} · {formatWhen(file.uploadedAt, DEMO_NOW)}
                    </span>
                    <span>{formatBytes(file.sizeBytes)}</span>
                    {/* Only where a file was actually stored. A record filed
                        before storage existed stays valid and simply offers
                        nothing to open, rather than a link that 404s. */}
                    {file.hasStoredFile ? (
                      <a
                        href={`/api/evidence/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-medium text-accent hover:underline"
                      >
                        <Icon name="Download" size="xs" />
                        {t("evidence.open")}
                      </a>
                    ) : null}
                    {action ? (
                      <span className="flex items-center gap-1">
                        <Icon name="ListChecks" size="xs" />
                        <span className="max-w-56 truncate">{action.title}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => onRemove(file.id)}
                    aria-label={`Remove ${file.fileName}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-content-tertiary opacity-0 transition-colors duration-150 hover:bg-surface-active hover:text-critical group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Icon name="Trash2" size="sm" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
});

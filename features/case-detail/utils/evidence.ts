import type { CaseEventKind, EvidenceKind } from "@/src/domain/types";

/** File types the evidence locker accepts, mapped to how they are shown. */
export const EVIDENCE_META: Record<
  EvidenceKind,
  { label: string; icon: string; className: string }
> = {
  IMAGE: {
    label: "Image",
    icon: "Image",
    className: "bg-status-verify-subtle text-status-verify border-status-verify-line",
  },
  PDF: {
    label: "PDF",
    icon: "FileText",
    className: "bg-critical-subtle text-critical-content border-critical-line",
  },
  SPREADSHEET: {
    label: "Spreadsheet",
    icon: "Sheet",
    className: "bg-success-subtle text-success-content border-success-line",
  },
  DOCUMENT: {
    label: "Document",
    icon: "FileText",
    className: "bg-accent-subtle text-accent-content border-accent-line",
  },
  NOTE: {
    label: "Note",
    icon: "StickyNote",
    className: "bg-surface-hover text-content-secondary border-line",
  },
};

/** Accepted by the drop zone. Anything outside this list is rejected by name. */
export const ACCEPTED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "pdf",
  "xlsx",
  "xls",
  "csv",
  "docx",
  "doc",
  "txt",
  "md",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

const KIND_BY_EXTENSION: Record<string, EvidenceKind> = {
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  gif: "IMAGE",
  webp: "IMAGE",
  pdf: "PDF",
  xlsx: "SPREADSHEET",
  xls: "SPREADSHEET",
  csv: "SPREADSHEET",
  docx: "DOCUMENT",
  doc: "DOCUMENT",
  txt: "NOTE",
  md: "NOTE",
};

export function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index + 1).toLowerCase();
}

export function evidenceKindOf(fileName: string): EvidenceKind | null {
  return KIND_BY_EXTENSION[extensionOf(fileName)] ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Timeline icon per event kind. Kept beside the evidence meta so the two agree. */
export const TIMELINE_ICON: Record<CaseEventKind, string> = {
  DETECTED: "Zap",
  CASE_CREATED: "Rows3",
  TRIAGED: "Filter",
  ASSIGNED: "UserCog",
  WORK_STARTED: "Play",
  ACTION_ADDED: "ListChecks",
  ACTION_COMPLETED: "CircleCheck",
  EVIDENCE_UPLOADED: "Paperclip",
  COMMENT_ADDED: "MessageSquare",
  PLAYBOOK_APPLIED: "BookMarked",
  ESCALATED: "TriangleAlert",
  VERIFICATION_REQUESTED: "ShieldCheck",
  VERIFICATION_APPROVED: "CircleCheck",
  VERIFICATION_REJECTED: "CircleX",
  REOPENED: "RefreshCw",
  CASE_CLOSED: "Lock",
  OWNER_CHANGED: "UserCog",
  STATUS_CHANGED: "Activity",
  PRIORITY_CHANGED: "Target",
  DUE_DATE_CHANGED: "CalendarClock",
};

/** Tone per event kind, so the rail reads at a glance. */
export const TIMELINE_TONE: Record<
  CaseEventKind,
  "neutral" | "accent" | "success" | "critical" | "verify"
> = {
  DETECTED: "critical",
  CASE_CREATED: "neutral",
  TRIAGED: "neutral",
  ASSIGNED: "accent",
  WORK_STARTED: "accent",
  ACTION_ADDED: "neutral",
  ACTION_COMPLETED: "success",
  EVIDENCE_UPLOADED: "neutral",
  COMMENT_ADDED: "neutral",
  PLAYBOOK_APPLIED: "neutral",
  ESCALATED: "critical",
  VERIFICATION_REQUESTED: "verify",
  VERIFICATION_APPROVED: "success",
  VERIFICATION_REJECTED: "critical",
  REOPENED: "critical",
  CASE_CLOSED: "success",
  OWNER_CHANGED: "accent",
  STATUS_CHANGED: "accent",
  PRIORITY_CHANGED: "accent",
  DUE_DATE_CHANGED: "accent",
};

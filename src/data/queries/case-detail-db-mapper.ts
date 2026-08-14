import { AUDIT_SOURCE_LABEL, auditEventLabel } from "@/src/config/app-config";
import {
  EVIDENCE_KINDS,
  KPI_KEYS,
  USER_ROLES,
  type ActionOrigin,
  type ActionStatus,
  type CaseAuditEntry,
  type CaseEvidence,
  type CaseListItem,
  type CorrectiveAction,
  type EvidenceKind,
  type KpiKey,
  type User,
  type UserRole,
  type VerificationDecision,
  type VerificationRecord,
} from "@/src/domain/types";
import { KPI_MEASUREMENT_WINDOW_DAYS } from "@/src/lib/constants";
import { getPrisma } from "../db";

/**
 * The execution record of one case, read from Neon.
 *
 * Companion to `case-db-mapper.ts`, which maps the case row itself. Same rule
 * applies: Prisma types stop here. Everything returned is the view model the
 * Case Detail cards already render, so the fixture path and the database path
 * are interchangeable and the UI cannot tell which one it was given.
 *
 * Three kinds of translation happen in this file, and none of them is a cast.
 *
 * 1. **Composition.** `caseNo`, `caseTitle`, `priorityBand` and `plantCode` are
 *    properties of the case, not of an action, so they are taken from the case
 *    rather than duplicated onto every action row. `evidenceCount` is counted
 *    from the linked evidence for the same reason — a stored copy would drift
 *    the moment a file is attached.
 * 2. **Validated widening.** A stored `String` becoming a union type is checked
 *    against the union's own member list, with a stated fallback. Casting would
 *    make a typo in one row a runtime crash three layers up.
 * 3. **Null narrowing.** The schema models "not recorded" as null; several view
 *    models want a string. Converting once here means no card has to.
 */

/* ------------------------------------------------------------- Translation */

const EVIDENCE_KIND_SET = new Set<string>(EVIDENCE_KINDS);
const KPI_KEY_SET = new Set<string>(KPI_KEYS);
const USER_ROLE_SET = new Set<string>(USER_ROLES);

/**
 * File descriptions that are not one of the five kinds the locker renders.
 * Covers the extensions and MIME fragments a real upload path produces, so a
 * connector writing "application/pdf" is not shown as a generic document.
 */
const EVIDENCE_KIND_ALIAS: Record<string, EvidenceKind> = {
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  gif: "IMAGE",
  webp: "IMAGE",
  pdf: "PDF",
  xlsx: "SPREADSHEET",
  xls: "SPREADSHEET",
  csv: "SPREADSHEET",
  sheet: "SPREADSHEET",
  docx: "DOCUMENT",
  doc: "DOCUMENT",
  txt: "NOTE",
  md: "NOTE",
  note: "NOTE",
};

/**
 * `Evidence.fileType` is a free `String` in the schema, so it cannot be trusted
 * to be one of the five kinds. The stored value wins when it is one; otherwise
 * the aliases are tried, then the file extension, and only then does it fall
 * back — a document badge is the honest answer for a file nobody classified.
 */
export function toEvidenceKind(fileType: string, fileName: string): EvidenceKind {
  const stored = fileType.trim().toUpperCase();
  if (EVIDENCE_KIND_SET.has(stored)) return stored as EvidenceKind;

  const lower = fileType.trim().toLowerCase();
  const aliased = EVIDENCE_KIND_ALIAS[lower] ?? EVIDENCE_KIND_ALIAS[lower.split("/").pop() ?? ""];
  if (aliased) return aliased;

  const dot = fileName.lastIndexOf(".");
  const extension = dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
  return EVIDENCE_KIND_ALIAS[extension] ?? "DOCUMENT";
}

/**
 * `AuditEvent.source` is stored as the words a person would write — the schema
 * comment says "rule engine, Work Manager, case detail, API" — while the view
 * model is a union. `AUDIT_SOURCE_LABEL` already maps the union to exactly
 * those words, so this reads it backwards rather than keeping a second table
 * that could disagree with the labels on screen. Enum-shaped values are
 * accepted too, so a writer using the union key directly still resolves.
 */
const AUDIT_SOURCE_BY_TEXT = new Map<string, CaseAuditEntry["source"]>();
for (const [key, label] of Object.entries(AUDIT_SOURCE_LABEL) as [
  CaseAuditEntry["source"],
  string,
][]) {
  AUDIT_SOURCE_BY_TEXT.set(normaliseSourceText(label), key);
  AUDIT_SOURCE_BY_TEXT.set(normaliseSourceText(key), key);
}

function normaliseSourceText(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function toAuditSource(stored: string): CaseAuditEntry["source"] {
  // "API" is the fallback rather than a guess at a screen: an entry written by
  // something this build does not recognise arrived programmatically.
  return AUDIT_SOURCE_BY_TEXT.get(normaliseSourceText(stored)) ?? "API";
}

/** A stored role key, or null when it names a role this build does not have. */
export function toUserRole(roleKey: string | null | undefined): UserRole | null {
  if (!roleKey) return null;
  return USER_ROLE_SET.has(roleKey) ? (roleKey as UserRole) : null;
}

function toKpiKey(key: string | undefined, fallback: KpiKey): KpiKey {
  if (!key) return fallback;
  return KPI_KEY_SET.has(key) ? (key as KpiKey) : fallback;
}

export function toUser(row: {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  jobTitle: string;
  plantScope: string[];
  isActive: boolean;
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    // A user whose role key is unknown is still a person who did the work; they
    // are shown with the least-privileged role rather than dropped.
    role: toUserRole(row.roleKey) ?? "ANALYST",
    jobTitle: row.jobTitle,
    plantScope: row.plantScope,
    isActive: row.isActive,
  };
}

/**
 * Who reviews a case that has no reviewer named on the row.
 *
 * Same rule the fixture path applies, evaluated against the tenant's own
 * people: the plant's operations manager signs off where there is one,
 * otherwise whoever runs operations across the tenant. The owner is excluded at
 * every step — the point of verification is that it is a second pair of eyes.
 */
export function chooseReviewer(item: CaseListItem, candidates: User[]): User | null {
  const eligible = candidates.filter(
    (user) => user.isActive && user.role === "OPS_MANAGER" && user.id !== item.ownerId,
  );
  return (
    eligible.find(
      (user) => user.plantScope.length === 1 && user.plantScope[0] === item.plantCode,
    ) ??
    eligible.find((user) => user.plantScope.length === 0) ??
    eligible[0] ??
    null
  );
}

/* ------------------------------------------------------------------- Query */

/** Everything the Case Detail page needs beyond the case row itself. */
export interface CaseDetailRecords {
  /** The named reviewer. Null when nobody has been routed the sign-off yet. */
  reviewer: User | null;
  actions: CorrectiveAction[];
  evidence: CaseEvidence[];
  verification: VerificationRecord | null;
  audit: CaseAuditEntry[];
  /** Everyone referenced by the record, so the timeline can name its actors. */
  userById: Record<string, User | undefined>;
}

/**
 * One round trip for the whole record, plus one for the audit trail — which
 * hangs off the tenant and the entity rather than off the case, so it cannot be
 * included in the same query.
 *
 * Tenant is a WHERE clause on both. The case is looked up by its composite
 * `(tenantId, caseNo)` key, so a case number belonging to another tenant does
 * not resolve here at all rather than resolving and being filtered later.
 */
export async function findCaseDetailRecords(
  tenantId: string,
  item: CaseListItem,
): Promise<CaseDetailRecords | null> {
  const prisma = getPrisma();

  const row = await prisma.case.findUnique({
    where: { tenantId_caseNo: { tenantId, caseNo: item.caseNo } },
    include: {
      reviewer: true,
      actions: {
        include: { owner: true, evidence: { select: { id: true } } },
        orderBy: [{ sequence: "asc" }, { dueAt: "asc" }],
      },
      evidence: { include: { uploadedBy: true }, orderBy: { uploadedAt: "asc" } },
      measurements: { include: { kpi: true }, orderBy: { measuredAt: "desc" }, take: 1 },
      verification: { include: { requestedBy: true, reviewer: true } },
    },
  });

  if (!row) return null;

  const auditRows = await prisma.auditEvent.findMany({
    where: { tenantId, entityType: "Case", entityId: row.id },
    include: { user: true },
    orderBy: { occurredAt: "desc" },
  });

  const userById: Record<string, User | undefined> = {};
  const remember = (user: Parameters<typeof toUser>[0] | null | undefined) => {
    if (user) userById[user.id] = toUser(user);
  };

  remember(row.reviewer);
  for (const action of row.actions) remember(action.owner);
  for (const file of row.evidence) remember(file.uploadedBy);
  remember(row.verification?.requestedBy);
  remember(row.verification?.reviewer);
  for (const entry of auditRows) remember(entry.user);
  if (item.owner) userById[item.owner.id] = item.owner;

  /* ------------------------------------------------------ Corrective actions */

  const actions: CorrectiveAction[] = row.actions.map((action) => ({
    id: action.id,
    caseId: item.id,
    // Composed from the case rather than stored again on the action.
    caseNo: item.caseNo,
    caseTitle: item.title,
    priorityBand: item.priorityBand,
    plantCode: item.plantCode,
    title: action.title,
    description: action.description,
    ownerId: action.ownerId,
    status: action.status as ActionStatus,
    origin: action.origin as ActionOrigin,
    dueAt: action.dueAt.toISOString(),
    completedAt: action.completedAt?.toISOString() ?? null,
    completionPct: action.completionPct,
    // The schema allows an action with no progress note; the card expects a
    // string and shows its own prompt when it is empty.
    notes: action.notes ?? "",
    evidenceCount: action.evidence.length,
  }));

  /* ---------------------------------------------------------------- Evidence */

  const evidence: CaseEvidence[] = row.evidence.map((file) => ({
    id: file.id,
    caseId: item.id,
    fileName: file.fileName,
    kind: toEvidenceKind(file.fileType, file.fileName),
    sizeBytes: file.fileSizeBytes,
    uploadedById: file.uploadedById,
    uploadedByName: file.uploadedBy.name,
    uploadedAt: file.uploadedAt.toISOString(),
    // `proves` is the reason the file counts as evidence, which is exactly what
    // the locker renders as its description.
    description: file.proves,
    actionId: file.actionId,
    accepted: file.accepted,
  }));

  /* ------------------------------------------------------------ Verification */

  // A verification is a decision about a measurement, so the record the card
  // renders is the two joined on the case. The measurement carries the numbers;
  // the verification carries who asked, who reviews and what they concluded.
  const measurement = row.measurements[0];
  const verification: VerificationRecord | null = row.verification
    ? {
        id: row.verification.id,
        caseId: item.id,
        requestedById: row.verification.requestedById,
        requestedByName: row.verification.requestedBy.name,
        requestedAt: row.verification.requestedAt.toISOString(),
        reviewerId: row.verification.reviewerId,
        reviewerName: row.verification.reviewer.name,
        decision: (row.verification.decision as VerificationDecision | null) ?? null,
        decidedAt: row.verification.decidedAt?.toISOString() ?? null,
        // Pending is a real state: nobody has written a justification yet.
        comment: row.verification.comment ?? "",
        notes: row.verification.notes ?? "",
        kpiKey: toKpiKey(measurement?.kpi.key, item.kpiKey),
        kpiBaseline: measurement?.baseline ?? item.baselineValue,
        // Null while the window is open and no reading has been captured. The
        // card renders that as "—" rather than inventing a number.
        kpiCurrent: measurement?.current ?? null,
        kpiTarget: measurement?.target ?? item.targetValue,
        measurementWindowDays:
          row.verification.windowDays ??
          measurement?.windowDays ??
          KPI_MEASUREMENT_WINDOW_DAYS,
      }
    : null;

  /* ------------------------------------------------------------------ Audit */

  const audit: CaseAuditEntry[] = auditRows.map((entry) => ({
    id: entry.id,
    at: entry.occurredAt.toISOString(),
    actorId: entry.userId,
    // Null user means the platform acted — an SLA timer has no author.
    actorName: entry.user?.name ?? "QuikOps platform",
    actorRole: toUserRole(entry.user?.roleKey),
    action: auditEventLabel(entry.event),
    field: entry.field,
    fromValue: entry.fromValue,
    toValue: entry.toValue,
    source: toAuditSource(entry.source),
  }));

  return {
    reviewer: row.reviewer ? toUser(row.reviewer) : null,
    actions,
    evidence,
    verification,
    audit,
    userById,
  };
}

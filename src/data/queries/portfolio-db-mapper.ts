import type {
  ActionItem,
  ActionOrigin,
  ActionStatus,
  CaseAuditEntry,
  CaseListItem,
} from "@/src/domain/types";
import { getPrisma } from "../db";
import { auditEventLabel } from "@/src/config/app-config";
import { toAuditSource, toUserRole } from "./case-detail-db-mapper";

/**
 * Tenant-wide reads for the screens that look across cases rather than into one.
 *
 * Companion to `case-db-mapper` (one case row) and `case-detail-db-mapper` (one
 * case's record). These answer "everything in the tenant", which is what the
 * Audit Log and My Work ask for, and they do it in one query each rather than
 * one per case.
 *
 * Tenant is a WHERE clause on every query here, never a filter applied after
 * the fact.
 */

/** An audit entry with the case context a network-wide view needs. */
export interface StoredAuditEntry extends CaseAuditEntry {
  caseNo: string;
  caseTitle: string;
  plantCode: string;
  plantName: string;
}

/**
 * The whole tenant's audit trail, newest first.
 *
 * Entries whose entity is not a case are skipped rather than shown with an
 * empty case column: the screen is a case audit log, and a row it cannot
 * attribute to a case would render as a blank line nobody can act on.
 */
export async function findAuditForTenant(tenantId: string): Promise<StoredAuditEntry[]> {
  const rows = await getPrisma().auditEvent.findMany({
    where: { tenantId, entityType: "Case" },
    include: { user: true },
    orderBy: { occurredAt: "desc" },
  });

  const cases = await getPrisma().case.findMany({
    where: { tenantId },
    select: { id: true, caseNo: true, title: true, plant: { select: { code: true, name: true } } },
  });
  const caseById = new Map(cases.map((entry) => [entry.id, entry]));

  const entries: StoredAuditEntry[] = [];
  for (const row of rows) {
    const context = caseById.get(row.entityId);
    if (!context) continue;
    entries.push({
      id: row.id,
      at: row.occurredAt.toISOString(),
      actorId: row.userId,
      // Null user means the platform acted — an SLA timer has no author.
      actorName: row.user?.name ?? "QuikOps platform",
      actorRole: toUserRole(row.user?.roleKey),
      action: auditEventLabel(row.event),
      field: row.field,
      fromValue: row.fromValue,
      toValue: row.toValue,
      source: toAuditSource(row.source),
      caseNo: context.caseNo,
      caseTitle: context.title,
      plantCode: context.plant.code,
      plantName: context.plant.name,
    });
  }
  return entries;
}

/** Every corrective action still open in the tenant, soonest due first. */
export async function findOpenActionsForTenant(
  tenantId: string,
  cases: CaseListItem[],
): Promise<ActionItem[]> {
  const rows = await getPrisma().correctiveAction.findMany({
    where: { tenantId, status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] } },
    orderBy: [{ dueAt: "asc" }, { sequence: "asc" }],
  });
  return toActionItems(rows, cases);
}

/**
 * The corrective actions one person owns, across every case in the tenant.
 *
 * Shaped as `ActionItem` because that is what My Work renders — the case
 * context travels on the action rather than being looked up again per row.
 */
export async function findActionsForOwner(
  tenantId: string,
  ownerId: string,
  cases: CaseListItem[],
): Promise<ActionItem[]> {
  const rows = await getPrisma().correctiveAction.findMany({
    where: { tenantId, ownerId },
    orderBy: [{ dueAt: "asc" }, { sequence: "asc" }],
  });
  return toActionItems(rows, cases);
}

interface StoredActionRow {
  id: string;
  caseId: string;
  title: string;
  description: string;
  ownerId: string;
  status: ActionStatus;
  origin: ActionOrigin;
  dueAt: Date;
  completedAt: Date | null;
}

/** Joins stored actions to the case context the list views render. */
function toActionItems(rows: StoredActionRow[], cases: CaseListItem[]): ActionItem[] {
  const caseById = new Map(cases.map((entry) => [entry.id, entry]));

  return rows.flatMap((row) => {
    const item = caseById.get(row.caseId);
    // An action whose case is outside the caller's scope is not this view's to
    // show; dropping it is correct rather than rendering an orphan.
    if (!item) return [];
    return [
      {
        id: row.id,
        caseId: row.caseId,
        caseNo: item.caseNo,
        caseTitle: item.title,
        priorityBand: item.priorityBand,
        plantCode: item.plantCode,
        title: row.title,
        description: row.description,
        ownerId: row.ownerId,
        status: row.status,
        origin: row.origin,
        dueAt: row.dueAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
      },
    ];
  });
}

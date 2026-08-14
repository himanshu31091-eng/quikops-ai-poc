"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/src/auth/session";
import { ACTION_STATUS_META, CASE_STATUS_META, PRIORITY_META } from "@/src/config/app-config";
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { verifiedKpiValue } from "@/src/domain/kpi-outcome";
import type {
  ActionStatus,
  CaseStatus,
  EvidenceKind,
  PriorityBand,
  VerificationDecision,
} from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { getPrisma, USE_DATABASE } from "../db";
import type { MutationResult } from "./result";

/**
 * Every write the Case Detail screen can make.
 *
 * **The browser is not trusted with identity.** It sends a case number, a
 * record id and validated scalars — never a tenant, never a user id it chose
 * for itself. The tenant comes from server configuration and the actor from
 * the session, resolved through the persona mapping (D-93). A payload that
 * named its own tenant would be the whole isolation model handed to whoever
 * opened dev tools.
 *
 * **Nothing changes without an audit row.** Every mutation writes its state
 * change and its audit event inside one transaction, so a record cannot exist
 * whose history is missing — the invariant the reducer has always enforced in
 * session, now enforced by the database.
 *
 * **Child records are located, never addressed.** An action, evidence file or
 * comment is only ever written through a `WHERE` that carries the tenant and
 * the case as well as the id, so a valid id belonging to another case (or
 * another tenant) matches zero rows and fails loudly rather than writing.
 *
 * **Time is frozen.** `DEMO_NOW` is now, everywhere. Each new audit row is
 * stamped one second after the last one on that case, which keeps ordering
 * unambiguous without calling the wall clock — the same rule the reducer uses
 * for its in-session events.
 */

const AUDIT_SOURCE = "Case detail";

const ok: MutationResult = { ok: true };
const fail = (error: string): MutationResult => ({ ok: false, error });

/** Prisma's transaction client — the subset these mutations use. */
type Tx = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

interface CaseContext {
  tx: Tx;
  tenantId: string;
  /** The Neon user behind the session persona. */
  actorId: string;
  actorName: string;
  record: {
    id: string;
    caseNo: string;
    status: CaseStatus;
    ownerId: string | null;
    reviewerId: string | null;
    priorityBand: PriorityBand;
  };
  /** Writes one audit row, ordered after everything already on this case. */
  audit: (entry: {
    event: string;
    field?: string;
    fromValue?: string | null;
    toValue?: string | null;
  }) => Promise<void>;
}

/**
 * Resolves the tenant, the actor and the case, then runs the mutation inside a
 * transaction and revalidates the screen it came from.
 *
 * A failure returns a message rather than throwing: the caller surfaces it in
 * the UI and re-reads the server state, so a rejected write never leaves an
 * optimistic change on screen pretending to be saved.
 */
async function withCase(
  caseNo: string,
  run: (ctx: CaseContext) => Promise<MutationResult>,
): Promise<MutationResult> {
  if (!USE_DATABASE) {
    return fail("The database is not enabled in this environment.");
  }

  const tenantId = DEFAULT_TENANT_ID;
  const normalised = caseNo.trim().toUpperCase();

  try {
    const actor = await getSessionUser();
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.case.findUnique({
        where: { tenantId_caseNo: { tenantId, caseNo: normalised } },
        select: {
          id: true,
          caseNo: true,
          status: true,
          ownerId: true,
          reviewerId: true,
          priorityBand: true,
        },
      });
      if (!record) return fail(`Case ${normalised} was not found in this tenant.`);

      // Ordered one second apart from the last event on this case, so a burst
      // of changes stays readable without a wall clock.
      const auditCount = await tx.auditEvent.count({
        where: { tenantId, entityType: "Case", entityId: record.id },
      });
      let seq = auditCount;

      const audit: CaseContext["audit"] = async (entry) => {
        seq += 1;
        await tx.auditEvent.create({
          data: {
            tenantId,
            userId: actor.id,
            event: entry.event,
            entityType: "Case",
            entityId: record.id,
            field: entry.field ?? null,
            fromValue: entry.fromValue ?? null,
            toValue: entry.toValue ?? null,
            source: AUDIT_SOURCE,
            occurredAt: new Date(DEMO_NOW.getTime() + seq * 1000),
          },
        });
      };

      return run({
        tx,
        tenantId,
        actorId: actor.id,
        actorName: actor.name,
        record: record as CaseContext["record"],
        audit,
      });
    });

    if (result.ok) {
      revalidatePath(`/work/${normalised}`);
      revalidatePath("/work");
    }
    return result;
  } catch (error) {
    // The message is for the person who has just lost a change; the detail
    // belongs in the server log, not on their screen.
    console.error(`[case-mutations] ${normalised}`, error);
    return fail("The change could not be saved. Nothing was written.");
  }
}

/** True when the id names an active user inside this tenant. */
async function isTenantUser(tx: Tx, tenantId: string, userId: string): Promise<boolean> {
  const count = await tx.user.count({ where: { id: userId, tenantId, isActive: true } });
  return count === 1;
}

async function nameOf(tx: Tx, userId: string | null): Promise<string> {
  if (!userId) return "Unassigned";
  const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "Unassigned";
}

/* ------------------------------------------------------------ The case row */

export async function assignOwnerAction(
  caseNo: string,
  ownerId: string | null,
): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    if (ownerId !== null && !(await isTenantUser(tx, tenantId, ownerId))) {
      return fail("That owner is not a user in this tenant.");
    }

    // A detected case that gains an owner is, by definition, assigned. Same
    // derivation the reducer applies, so both paths agree on the status.
    const status: CaseStatus =
      ownerId !== null &&
      (record.status === "NEW" || record.status === "TRIAGED" || record.status === "REOPENED")
        ? "ASSIGNED"
        : record.status;

    const from = await nameOf(tx, record.ownerId);
    const to = await nameOf(tx, ownerId);

    await tx.case.update({
      where: { id: record.id },
      data: { ownerId, status, assignedAt: ownerId ? DEMO_NOW : null },
    });
    await audit({
      event: "case.assigned",
      field: "ownerId",
      fromValue: from,
      toValue: to,
    });
    if (status !== record.status) {
      await audit({
        event: "case.status_changed",
        field: "status",
        fromValue: record.status,
        toValue: status,
      });
    }
    return ok;
  });
}

export async function setReviewerAction(
  caseNo: string,
  reviewerId: string,
): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    if (!(await isTenantUser(tx, tenantId, reviewerId))) {
      return fail("That reviewer is not a user in this tenant.");
    }
    const from = await nameOf(tx, record.reviewerId);
    await tx.case.update({ where: { id: record.id }, data: { reviewerId } });
    await audit({
      event: "case.reviewer_changed",
      field: "reviewerId",
      fromValue: from,
      toValue: await nameOf(tx, reviewerId),
    });
    return ok;
  });
}

export async function setDueAtAction(caseNo: string, dueAtIso: string): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, record, audit }) => {
    const dueAt = new Date(dueAtIso);
    if (Number.isNaN(dueAt.getTime())) return fail("That due date is not a valid date.");

    const previous = await tx.case.findUnique({ where: { id: record.id }, select: { dueAt: true } });
    await tx.case.update({ where: { id: record.id }, data: { dueAt } });
    await audit({
      event: "case.due_changed",
      field: "dueAt",
      fromValue: previous?.dueAt.toISOString() ?? null,
      toValue: dueAt.toISOString(),
    });
    return ok;
  });
}

export async function setPriorityAction(
  caseNo: string,
  band: PriorityBand,
): Promise<MutationResult> {
  if (!Object.hasOwn(PRIORITY_META, band)) return fail("Unknown priority band.");

  return withCase(caseNo, async ({ tx, record, audit }) => {
    if (record.priorityBand === band) return ok;
    await tx.case.update({ where: { id: record.id }, data: { priorityBand: band } });
    await audit({
      event: "case.priority_overridden",
      field: "priorityBand",
      fromValue: record.priorityBand,
      toValue: band,
    });
    return ok;
  });
}

export async function setStatusAction(
  caseNo: string,
  status: CaseStatus,
): Promise<MutationResult> {
  if (!Object.hasOwn(CASE_STATUS_META, status)) return fail("Unknown case status.");

  return withCase(caseNo, async ({ tx, record, audit }) => {
    if (record.status === status) return ok;
    await tx.case.update({ where: { id: record.id }, data: { status } });
    await audit({
      event: "case.status_changed",
      field: "status",
      fromValue: record.status,
      toValue: status,
    });
    return ok;
  });
}

export async function startWorkAction(caseNo: string): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, record, audit }) => {
    if (record.status === "IN_PROGRESS") return ok;
    await tx.case.update({ where: { id: record.id }, data: { status: "IN_PROGRESS" } });
    await audit({
      event: "case.work_started",
      field: "status",
      fromValue: record.status,
      toValue: "IN_PROGRESS",
    });
    return ok;
  });
}

/* ----------------------------------------------------- Corrective actions */

export async function addActionAction(
  caseNo: string,
  draft: { title: string; description: string; ownerId: string; dueAt: string },
): Promise<MutationResult> {
  const title = draft.title.trim();
  if (!title) return fail("An action needs a title.");
  const dueAt = new Date(draft.dueAt);
  if (Number.isNaN(dueAt.getTime())) return fail("That due date is not a valid date.");

  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    if (!(await isTenantUser(tx, tenantId, draft.ownerId))) {
      return fail("That action owner is not a user in this tenant.");
    }
    const last = await tx.correctiveAction.findFirst({
      where: { tenantId, caseId: record.id },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });

    await tx.correctiveAction.create({
      data: {
        tenantId,
        caseId: record.id,
        title,
        description: draft.description.trim(),
        ownerId: draft.ownerId,
        status: "TODO",
        completionPct: 0,
        sequence: (last?.sequence ?? -1) + 1,
        dueAt,
      },
    });
    await audit({ event: "action.added", field: "title", toValue: title });
    return ok;
  });
}

export async function updateActionAction(
  caseNo: string,
  actionId: string,
  patch: {
    title?: string;
    description?: string;
    ownerId?: string;
    dueAt?: string;
    notes?: string;
    completionPct?: number;
    status?: ActionStatus;
  },
): Promise<MutationResult> {
  if (patch.status !== undefined && !Object.hasOwn(ACTION_STATUS_META, patch.status)) {
    return fail("Unknown action status.");
  }
  if (
    patch.completionPct !== undefined &&
    (!Number.isFinite(patch.completionPct) || patch.completionPct < 0 || patch.completionPct > 100)
  ) {
    return fail("Progress must be between 0 and 100.");
  }

  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    const existing = await tx.correctiveAction.findFirst({
      where: { id: actionId, tenantId, caseId: record.id },
    });
    if (!existing) return fail("That action does not belong to this case.");

    if (patch.ownerId !== undefined && !(await isTenantUser(tx, tenantId, patch.ownerId))) {
      return fail("That action owner is not a user in this tenant.");
    }

    // Status is derived from progress, never typed in independently — the rule
    // the reducer enforces, applied here so the database cannot hold a DONE
    // action sitting at 40%.
    const completionPct =
      patch.status === "DONE" ? 100 : (patch.completionPct ?? existing.completionPct);
    const status: ActionStatus =
      patch.status ??
      (completionPct >= 100 ? "DONE" : completionPct > 0 ? "IN_PROGRESS" : "TODO");

    const dueAt = patch.dueAt === undefined ? undefined : new Date(patch.dueAt);
    if (dueAt && Number.isNaN(dueAt.getTime())) return fail("That due date is not a valid date.");

    await tx.correctiveAction.update({
      where: { id: existing.id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
        ...(patch.ownerId !== undefined ? { ownerId: patch.ownerId } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(dueAt ? { dueAt } : {}),
        completionPct,
        status,
        completedAt: status === "DONE" ? (existing.completedAt ?? DEMO_NOW) : null,
      },
    });

    if (status !== existing.status) {
      await audit({
        event: status === "DONE" ? "action.completed" : "action.status_changed",
        field: "status",
        fromValue: existing.status,
        toValue: status,
      });
    } else {
      await audit({ event: "action.updated", field: "title", toValue: existing.title });
    }
    return ok;
  });
}

export async function removeActionAction(
  caseNo: string,
  actionId: string,
): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    const existing = await tx.correctiveAction.findFirst({
      where: { id: actionId, tenantId, caseId: record.id },
      select: { id: true, title: true },
    });
    if (!existing) return fail("That action does not belong to this case.");

    // Evidence outlives the action it was filed against: the file still proves
    // something about the case, and deleting it to satisfy a foreign key would
    // destroy the record rather than tidy it.
    await tx.evidence.updateMany({
      where: { tenantId, caseId: record.id, actionId: existing.id },
      data: { actionId: null },
    });
    await tx.correctiveAction.delete({ where: { id: existing.id } });
    await audit({ event: "action.removed", field: "title", fromValue: existing.title });
    return ok;
  });
}

export async function reorderActionAction(
  caseNo: string,
  actionId: string,
  direction: -1 | 1,
): Promise<MutationResult> {
  if (direction !== -1 && direction !== 1) return fail("Unknown reorder direction.");

  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    const actions = await tx.correctiveAction.findMany({
      where: { tenantId, caseId: record.id },
      orderBy: [{ sequence: "asc" }, { dueAt: "asc" }],
      select: { id: true, title: true },
    });
    const index = actions.findIndex((entry) => entry.id === actionId);
    if (index === -1) return fail("That action does not belong to this case.");

    const target = index + direction;
    if (target < 0 || target >= actions.length) return ok;

    const reordered = [...actions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);

    // Sequence is rewritten across the plan rather than swapped in place, so
    // rows seeded without an explicit order end up with a total ordering
    // instead of a set of ties.
    for (const [position, entry] of reordered.entries()) {
      await tx.correctiveAction.update({ where: { id: entry.id }, data: { sequence: position } });
    }
    await audit({
      event: "action.reordered",
      field: "sequence",
      fromValue: String(index + 1),
      toValue: String(target + 1),
    });
    return ok;
  });
}

/* ------------------------------------------------------------- Evidence */

export async function addEvidenceAction(
  caseNo: string,
  drafts: {
    fileName: string;
    kind: EvidenceKind;
    sizeBytes: number;
    description: string;
    actionId: string | null;
    storageUrl?: string;
    storagePath?: string;
  }[],
): Promise<MutationResult> {
  if (drafts.length === 0) return ok;

  return withCase(caseNo, async ({ tx, tenantId, actorId, record, audit }) => {
    for (const draft of drafts) {
      const fileName = draft.fileName.trim();
      if (!fileName) return fail("Evidence needs a file name.");

      if (draft.actionId) {
        const owned = await tx.correctiveAction.count({
          where: { id: draft.actionId, tenantId, caseId: record.id },
        });
        if (owned !== 1) return fail("That action does not belong to this case.");
      }

      await tx.evidence.create({
        data: {
          tenantId,
          caseId: record.id,
          actionId: draft.actionId,
          fileName,
          // Stored as the kind the reader expects; `toEvidenceKind` reads it
          // straight back rather than having to infer from an extension.
          fileType: draft.kind,
          fileSizeBytes: Math.max(0, Math.round(draft.sizeBytes)),
          proves: draft.description.trim(),
          uploadedById: actorId,
          uploadedAt: DEMO_NOW,
          accepted: false,
          // Written only when the browser actually got the file into the
          // store; a failed upload still records the evidence, without a file.
          storageUrl: draft.storageUrl ?? null,
          storagePath: draft.storagePath ?? null,
        },
      });
      await audit({ event: "evidence.added", field: "fileName", toValue: fileName });
    }
    return ok;
  });
}

export async function removeEvidenceAction(
  caseNo: string,
  evidenceId: string,
): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, tenantId, record, audit }) => {
    const existing = await tx.evidence.findFirst({
      where: { id: evidenceId, tenantId, caseId: record.id },
      select: { id: true, fileName: true },
    });
    if (!existing) return fail("That evidence does not belong to this case.");

    await tx.evidence.delete({ where: { id: existing.id } });
    await audit({ event: "evidence.removed", field: "fileName", fromValue: existing.fileName });
    return ok;
  });
}

/* ------------------------------------------------------------- Comments */

export async function addCommentAction(caseNo: string, body: string): Promise<MutationResult> {
  const text = body.trim();
  if (!text) return fail("A comment needs something in it.");
  if (text.length > 4000) return fail("That comment is too long to store.");

  return withCase(caseNo, async ({ tx, tenantId, actorId, record, audit }) => {
    await tx.comment.create({
      data: { tenantId, caseId: record.id, authorId: actorId, body: text, createdAt: DEMO_NOW },
    });
    await audit({ event: "comment.added" });
    return ok;
  });
}

/* --------------------------------------------------------- Verification */

export async function requestVerificationAction(caseNo: string): Promise<MutationResult> {
  return withCase(caseNo, async ({ tx, tenantId, actorId, record, audit }) => {
    const reviewerId = record.reviewerId;
    if (!reviewerId) {
      return fail("This case has no reviewer. Name one before requesting verification.");
    }
    // The point of verification is a second pair of eyes. Requesting your own
    // sign-off is the one shortcut this workflow exists to prevent.
    if (reviewerId === actorId) {
      return fail("You are the reviewer on this case and cannot request your own sign-off.");
    }

    await tx.verification.upsert({
      where: { caseId: record.id },
      create: {
        tenantId,
        caseId: record.id,
        requestedById: actorId,
        requestedAt: DEMO_NOW,
        reviewerId,
        windowDays: 14,
        notes: null,
      },
      // A re-request after a rejection reopens the same row: one verification
      // per case, carrying its own history in the audit trail.
      update: {
        requestedById: actorId,
        requestedAt: DEMO_NOW,
        reviewerId,
        decision: null,
        decidedAt: null,
        comment: null,
      },
    });
    await tx.case.update({ where: { id: record.id }, data: { status: "PENDING_VERIFY" } });
    await audit({
      event: "verification.requested",
      field: "status",
      fromValue: record.status,
      toValue: "PENDING_VERIFY",
    });
    return ok;
  });
}

export async function decideVerificationAction(
  caseNo: string,
  draft: { decision: VerificationDecision; comment: string; notes: string },
): Promise<MutationResult> {
  if (draft.decision !== "APPROVED" && draft.decision !== "REJECTED" && draft.decision !== "SENT_BACK") {
    return fail("Unknown verification decision.");
  }

  return withCase(caseNo, async ({ tx, tenantId, actorId, record, audit }) => {
    const verification = await tx.verification.findFirst({
      where: { caseId: record.id, tenantId },
    });
    if (!verification) return fail("This case has not been submitted for verification.");
    if (verification.decision) return fail("This verification has already been decided.");

    /* Segregation of duties, enforced where it cannot be bypassed.
     *
     * The UI hides the decision from everyone but the reviewer; that stops the
     * people who were not going to try. These three checks are what actually
     * hold: only the named reviewer decides, and never the person who asked
     * for the sign-off or the person who owns the work. */
    if (verification.reviewerId !== actorId) {
      return fail("Only the named reviewer can record this decision.");
    }
    if (verification.requestedById === actorId) {
      return fail("The person who requested verification cannot decide it.");
    }
    if (record.ownerId === actorId) {
      return fail("The case owner cannot verify their own work.");
    }

    const approved = draft.decision === "APPROVED";
    const status: CaseStatus = approved ? "VERIFIED" : "IN_PROGRESS";

    await tx.verification.update({
      where: { id: verification.id },
      data: {
        decision: draft.decision,
        decidedAt: DEMO_NOW,
        comment: draft.comment.trim() || null,
        notes: draft.notes.trim() || null,
      },
    });

    await tx.case.update({
      where: { id: record.id },
      data: {
        status,
        verifiedAt: approved ? DEMO_NOW : null,
        closedAt: approved ? DEMO_NOW : null,
      },
    });

    // Verification is the only path to a final KPI reading, which is what makes
    // the number defensible: it exists because somebody signed the work off.
    if (approved) {
      const measurement = await tx.kpiMeasurement.findFirst({
        where: { tenantId, caseId: record.id },
        orderBy: { measuredAt: "desc" },
      });
      if (measurement) {
        const current = verifiedKpiValue(measurement.baseline, measurement.target);
        await tx.kpiMeasurement.update({
          where: { id: measurement.id },
          data: { current, inProgress: false, measuredAt: DEMO_NOW },
        });
        await audit({
          event: "kpi.measured",
          field: "current",
          fromValue: measurement.current === null ? null : String(measurement.current),
          toValue: String(current),
        });
      }

      // Accepting the decision accepts the evidence it rested on.
      await tx.evidence.updateMany({
        where: { tenantId, caseId: record.id },
        data: { accepted: true },
      });
    }

    await audit({
      event: approved ? "verification.approved" : "verification.rejected",
      field: "decision",
      fromValue: "Pending",
      toValue: draft.decision,
    });
    await audit({
      event: "case.status_changed",
      field: "status",
      fromValue: record.status,
      toValue: status,
    });
    return ok;
  });
}

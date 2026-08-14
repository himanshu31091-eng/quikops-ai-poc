"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/src/auth/session";
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { computePriority } from "@/src/domain/priority";
import { dueAtFor } from "@/src/domain/sla";
import type { CustomerTier, ExceptionType, KpiKey } from "@/src/domain/types";
import { DEMO_NOW, KPI_MEASUREMENT_WINDOW_DAYS } from "@/src/lib/constants";
import { getPrisma, USE_DATABASE } from "../db";
import type { CreateCaseResult } from "./result";

/**
 * Raising a case by hand, persisted.
 *
 * The same rules as every other mutation: the tenant comes from server
 * configuration, the actor from the session, and the browser sends nothing but
 * the form it filled in. A draft naming its own tenant, its own author or its
 * own case number would make every guarantee below decorative.
 *
 * **Priority is scored, never accepted.** The draft carries revenue, tier and
 * urgency; the band comes out of the same engine an ingested signal runs
 * through, so a manual case can be defended in a review on identical terms.
 * Nobody types a priority.
 */

/** The KPI a case of each type is measured against once its window opens. */
const KPI_BY_EXCEPTION: Record<ExceptionType, KpiKey> = {
  VENDOR_DELAY: "SUPPLIER_OTD_PCT",
  MATERIAL_SHORTAGE: "OTIF_PCT",
  CAPACITY_CONSTRAINT: "SCHEDULE_ADHERENCE_PCT",
  QUALITY_HOLD: "OTIF_PCT",
  INVENTORY_EXCESS: "INVENTORY_DAYS",
  INVENTORY_STOCKOUT: "INVENTORY_DAYS",
  PLANNING_DEVIATION: "FORECAST_ACCURACY_PCT",
  DELIVERY_AT_RISK: "OTIF_PCT",
  OTHER: "OTIF_PCT",
};

const EXCEPTION_TYPES = new Set<string>(Object.keys(KPI_BY_EXCEPTION));
const CUSTOMER_TIERS = new Set<string>(["TIER_1", "TIER_2", "TIER_3", "NONE"]);

export interface NewCaseInput {
  title: string;
  plantCode: string;
  exceptionType: ExceptionType;
  materialCode: string;
  materialDesc: string;
  supplierName: string;
  customerName: string;
  customerTier: CustomerTier | "NONE";
  revenueAtRisk: string;
  daysToPromisedDate: string;
  ownerId: string;
  description: string;
}

const fail = (error: string): CreateCaseResult => ({ ok: false, error });

/**
 * The next case number for this tenant.
 *
 * Derived from the highest number already stored rather than from a count, so
 * a deleted case cannot cause a collision. Ordering is lexicographic, which is
 * only safe because every number in a tenant shares a prefix and a fixed digit
 * width — true of the seeded corpus and of everything this function produces.
 *
 * The real guard is the unique `(tenantId, caseNo)` index: two people creating
 * a case in the same instant produce the same candidate, and the second write
 * fails rather than silently duplicating. The caller retries.
 */
function nextCaseNo(latestCaseNo: string | null): string {
  if (!latestCaseNo) {
    // An empty tenant still needs a well-formed number a person can read out.
    return `QO-${DEMO_NOW.getUTCFullYear()}-00001`;
  }

  const match = /^(.*?)(\d+)$/.exec(latestCaseNo);
  if (!match) return `${latestCaseNo}-1`;
  const [, prefix = "", digits = "0"] = match;
  return `${prefix}${String(Number(digits) + 1).padStart(digits.length, "0")}`;
}

export async function createCaseAction(draft: NewCaseInput): Promise<CreateCaseResult> {
  if (!USE_DATABASE) return fail("The database is not enabled in this environment.");

  const tenantId = DEFAULT_TENANT_ID;

  /* Validated again here, whatever the dialog already checked. Client-side
   * validation is a courtesy to the person typing; this is the rule. */
  const title = draft.title.trim();
  if (title.length < 8) return fail("Give the case a title a plant manager would recognise.");
  if (!EXCEPTION_TYPES.has(draft.exceptionType)) return fail("Unknown exception type.");
  if (!CUSTOMER_TIERS.has(draft.customerTier)) return fail("Unknown customer tier.");

  const revenueAtRisk = Math.round(Number(draft.revenueAtRisk));
  if (!Number.isFinite(revenueAtRisk) || revenueAtRisk < 0) {
    return fail("Enter the revenue exposed, as a whole number.");
  }

  const daysToPromisedDate = Number(draft.daysToPromisedDate);
  if (!Number.isInteger(daysToPromisedDate) || daysToPromisedDate < 0 || daysToPromisedDate > 365) {
    return fail("Enter whole days to the promised date, 0 – 365.");
  }

  try {
    const actor = await getSessionUser();
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { currency: true },
      });
      if (!tenant) return fail("This tenant is not configured.");

      // Scoped by tenant, so a plant code belonging to another tenant does not
      // resolve here at all rather than resolving and being filtered later.
      const plant = await tx.plant.findFirst({
        where: { tenantId, code: draft.plantCode },
        select: { id: true },
      });
      if (!plant) return fail("Select a plant that belongs to this tenant.");

      let ownerId: string | null = null;
      if (draft.ownerId) {
        const owner = await tx.user.findFirst({
          where: { id: draft.ownerId, tenantId, isActive: true },
          select: { id: true },
        });
        if (!owner) return fail("That owner is not a user in this tenant.");
        ownerId = owner.id;
      }

      const customerTier = draft.customerTier === "NONE" ? null : draft.customerTier;
      const priority = computePriority({
        revenueAtRisk,
        // No measurement has landed yet, so the KPI factor contributes nothing
        // until the first reading arrives. Priority rises on its own once it does.
        kpiDeviationPts: 0,
        customerTier,
        daysToPromisedDate,
        recurrenceCount: 1,
        escalationLevel: 0,
      });

      const openedAt = DEMO_NOW;
      const trimmed = (value: string): string | null => value.trim() || null;

      const latest = await tx.case.findFirst({
        where: { tenantId },
        orderBy: { caseNo: "desc" },
        select: { caseNo: true },
      });
      const caseNo = nextCaseNo(latest?.caseNo ?? null);
      const created = await tx.case.create({
        data: {
          tenantId,
          // Null: a person raised this, so it is not the seed's to manage.
          seedKey: null,
          caseNo,
          title,
          description:
            trimmed(draft.description) ??
            "Raised manually from the Work Manager. No detection signal is attached.",
          exceptionType: draft.exceptionType,
          detectedBy: "MANUAL",
          status: ownerId ? "ASSIGNED" : "NEW",
          priorityBand: priority.band,
          priorityScore: priority.score,
          escalationLevel: 0,
          plantId: plant.id,
          materialCode: trimmed(draft.materialCode),
          materialDesc: trimmed(draft.materialDesc),
          customerName: trimmed(draft.customerName),
          customerTier,
          supplierName: trimmed(draft.supplierName),
          revenueAtRisk: String(revenueAtRisk),
          currency: tenant.currency,
          ownerId,
          openedAt,
          assignedAt: ownerId ? openedAt : null,
          dueAt: new Date(dueAtFor(priority.band, openedAt)),
          lastDetectedAt: openedAt,
          recurrenceCount: 1,
        },
      });

      // A case states what it is measured against from the moment it exists.
      // Without this row the case reads as 0 against a target of 0, which is
      // not "unmeasured" — it is wrong.
      const kpi = await tx.kpiDefinition.findFirst({
        where: { tenantId, key: KPI_BY_EXCEPTION[draft.exceptionType] },
        select: { id: true },
      });
      if (kpi) {
        await tx.kpiMeasurement.create({
          data: {
            tenantId,
            seedKey: null,
            caseId: created.id,
            kpiId: kpi.id,
            // Nothing has been measured yet. Zeroes are the honest baseline
            // for a case raised by hand; the first reading replaces them.
            baseline: 0,
            target: 0,
            current: null,
            windowDays: KPI_MEASUREMENT_WINDOW_DAYS,
            windowOpenedAt: openedAt,
            inProgress: true,
            measuredAt: openedAt,
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          tenantId,
          seedKey: null,
          userId: actor.id,
          event: "case.created",
          entityType: "Case",
          entityId: created.id,
          field: "priorityBand",
          toValue: priority.band,
          source: "Work Manager",
          occurredAt: openedAt,
        },
      });

      return { ok: true as const, caseNo };
    });

    if (result.ok) {
      revalidatePath("/work");
      revalidatePath(`/work/${result.caseNo}`);
    }
    return result;
  } catch (error) {
    console.error("[work-mutations] createCase", error);
    return fail("The case could not be created. Nothing was written.");
  }
}

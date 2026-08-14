import { computePriority } from "@/src/domain/priority";
import type { CaseListItem, CustomerTier, KpiKey } from "@/src/domain/types";
import { KPI_MEASUREMENT_WINDOW_DAYS } from "@/src/lib/constants";
import { getPrisma } from "../db";

/**
 * Database rows to the view model the UI already expects.
 *
 * The whole point of this file is that it is the *only* place Prisma types are
 * visible. `Decimal` is converted here, relations are flattened here, and
 * everything above receives a plain `CaseListItem` — identical in shape to what
 * the fixtures produce, so Work Manager cannot tell the difference and needed
 * no changes.
 *
 * Three fields do not exist as columns and are derived, because the schema
 * models them where they belong rather than duplicating them onto the case:
 *
 * - `sourceSystem` / `sourceRecord` come from the linked `CaseSource`, which is
 *   a record in a system QuikOps does not own.
 * - `kpiKey` / `baselineValue` / `targetValue` come from the case's KPI
 *   measurement, since a target is a property of the measurement, not the case.
 * - `priorityFactors` is recomputed by the same deterministic rule set the
 *   fixtures use, so the popover explaining a score shows the real breakdown
 *   rather than a stored copy that could drift from the score beside it.
 */

const DAY_MS = 86_400_000;

/** Cases for a tenant, newest-priority first. Tenant is a WHERE clause, never a filter above. */
export async function findCasesForTenant(
  tenantId: string,
  now: Date,
): Promise<CaseListItem[]> {
  const rows = await getPrisma().case.findMany({
    where: { tenantId },
    include: {
      plant: true,
      owner: true,
      source: true,
      actions: { select: { status: true } },
      measurements: { include: { kpi: true }, orderBy: { measuredAt: "desc" }, take: 1 },
    },
    orderBy: { priorityScore: "desc" },
  });

  return rows.map((row) => {
    const measurement = row.measurements[0];
    const kpiKey = (measurement?.kpi.key ?? "OTIF_PCT") as KpiKey;
    const baselineValue = measurement?.baseline ?? 0;
    const targetValue = measurement?.target ?? 0;

    // `Decimal` never escapes this function.
    const revenueAtRisk = Number(row.revenueAtRisk);

    const openActionCount = row.actions.filter(
      (a) => a.status === "TODO" || a.status === "IN_PROGRESS" || a.status === "BLOCKED",
    ).length;

    const daysToPromisedDate = Math.round(
      (row.dueAt.getTime() - now.getTime()) / DAY_MS,
    );

    const priority = computePriority({
      revenueAtRisk,
      kpiDeviationPts: Math.max(targetValue - baselineValue, 0),
      customerTier: (row.customerTier as CustomerTier | null) ?? null,
      daysToPromisedDate,
      recurrenceCount: row.recurrenceCount,
      escalationLevel: row.escalationLevel,
    });

    return {
      id: row.id,
      caseNo: row.caseNo,
      title: row.title,
      description: row.description,
      exceptionType: row.exceptionType,
      detectedBy: row.detectedBy,
      sourceSystem: row.source?.system ?? "Manual entry",
      sourceRecord: row.source?.recordRef ?? "—",
      status: row.status,
      // The stored band and score stay authoritative; only the factor breakdown
      // is recomputed, so a seeded score cannot disagree with what is displayed.
      priorityBand: row.priorityBand,
      priorityScore: row.priorityScore,
      priorityFactors: priority.factors,
      escalationLevel: row.escalationLevel,
      plantCode: row.plant.code,
      materialCode: row.materialCode,
      materialDesc: row.materialDesc,
      customerCode: row.customerCode,
      customerName: row.customerName,
      customerTier: row.customerTier,
      supplierCode: row.supplierCode,
      supplierName: row.supplierName,
      revenueAtRisk,
      currency: row.currency,
      kpiKey,
      baselineValue,
      targetValue,
      measurementWindowDays: measurement?.windowDays ?? KPI_MEASUREMENT_WINDOW_DAYS,
      ownerId: row.ownerId,
      openedAt: row.openedAt.toISOString(),
      assignedAt: row.assignedAt?.toISOString() ?? null,
      dueAt: row.dueAt.toISOString(),
      slaBreachedAt: row.slaBreachedAt?.toISOString() ?? null,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      recurrenceCount: row.recurrenceCount,
      lastDetectedAt: row.lastDetectedAt.toISOString(),
      playbookId: row.playbookId,
      owner: row.owner
        ? {
            id: row.owner.id,
            email: row.owner.email,
            name: row.owner.name,
            role: row.owner.roleKey,
            jobTitle: row.owner.jobTitle,
            plantScope: row.owner.plantScope,
            isActive: row.owner.isActive,
          }
        : null,
      plant: {
        id: row.plant.id,
        code: row.plant.code,
        name: row.plant.name,
        country: row.plant.country,
        countryCode: row.plant.countryCode,
        timezone: row.plant.timezone,
      },
      openActionCount,
      totalActionCount: row.actions.length,
    };
  });
}

/** Plants for a tenant, in the shape the module already renders. */
export async function findPlantsForTenant(tenantId: string) {
  const rows = await getPrisma().plant.findMany({ where: { tenantId }, orderBy: { code: "asc" } });
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    country: p.country,
    countryCode: p.countryCode,
    timezone: p.timezone,
  }));
}

/** People a case can be assigned to. Executives sponsor work; they do not own it. */
export async function findAssignableUsersForTenant(tenantId: string) {
  const rows = await getPrisma().user.findMany({
    where: { tenantId, isActive: true, roleKey: { in: ["OPS_MANAGER", "TASK_OWNER", "ANALYST"] } },
    orderBy: { name: "asc" },
  });
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.roleKey,
    jobTitle: u.jobTitle,
    plantScope: u.plantScope,
    isActive: u.isActive,
  }));
}

import { computePriority } from "@/src/domain/priority";
import { dueAtFor } from "@/src/domain/sla";
import type {
  CaseListItem,
  CustomerTier,
  ExceptionType,
  KpiKey,
  Plant,
  User,
} from "@/src/domain/types";
import { KPI_MEASUREMENT_WINDOW_DAYS } from "@/src/lib/constants";
import type { NewCaseDraft } from "../types";

/**
 * Creating a case by hand runs through exactly the same priority engine as an
 * ingested signal. Nobody types a priority band: it is scored from revenue at
 * risk, customer tier and urgency, so a manual case can be defended in a review
 * on the same terms as an automated one.
 */

/** The KPI a case of each type is measured against once the window opens. */
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

export const EMPTY_DRAFT: NewCaseDraft = {
  title: "",
  plantCode: "",
  exceptionType: "VENDOR_DELAY",
  materialCode: "",
  materialDesc: "",
  supplierName: "",
  customerName: "",
  customerTier: "NONE",
  revenueAtRisk: "",
  daysToPromisedDate: "",
  ownerId: "",
  description: "",
};

export type DraftErrors = Partial<Record<keyof NewCaseDraft, string>>;

export function validateDraft(draft: NewCaseDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (draft.title.trim().length < 8) {
    errors.title = "Give the case a title a plant manager would recognise.";
  }
  if (draft.plantCode === "") {
    errors.plantCode = "Select the plant the case belongs to.";
  }

  const revenue = Number(draft.revenueAtRisk);
  if (draft.revenueAtRisk.trim() === "" || !Number.isFinite(revenue) || revenue < 0) {
    errors.revenueAtRisk = "Enter the revenue exposed, in whole dollars.";
  }

  const days = Number(draft.daysToPromisedDate);
  if (
    draft.daysToPromisedDate.trim() === "" ||
    !Number.isInteger(days) ||
    days < 0 ||
    days > 365
  ) {
    errors.daysToPromisedDate = "Enter whole days to the promised date, 0 – 365.";
  }

  return errors;
}

/** Next case number in the sequence, e.g. QO-2026-004182 → QO-2026-004183. */
export function nextCaseNo(lastCaseNo: string): string {
  const match = /^(.*?)(\d+)$/.exec(lastCaseNo);
  if (!match) return `${lastCaseNo}-1`;
  const [, prefix = "", digits = "0"] = match;
  return `${prefix}${String(Number(digits) + 1).padStart(digits.length, "0")}`;
}

interface BuildContext {
  lastCaseNo: string;
  plants: Plant[];
  users: User[];
  now: Date;
}

export function buildCaseFromDraft(
  draft: NewCaseDraft,
  { lastCaseNo, plants, users, now }: BuildContext,
): CaseListItem {
  const caseNo = nextCaseNo(lastCaseNo);
  const plant = plants.find((entry) => entry.code === draft.plantCode) ?? plants[0]!;
  const owner = users.find((entry) => entry.id === draft.ownerId) ?? null;
  const customerTier: CustomerTier | null =
    draft.customerTier === "NONE" ? null : draft.customerTier;
  const revenueAtRisk = Math.round(Number(draft.revenueAtRisk));
  const daysToPromisedDate = Number(draft.daysToPromisedDate);

  const priority = computePriority({
    revenueAtRisk,
    // No measurement has landed yet, so the KPI factor contributes nothing until
    // the first snapshot arrives. Priority rises on its own once it does.
    kpiDeviationPts: 0,
    customerTier,
    daysToPromisedDate,
    recurrenceCount: 1,
    escalationLevel: 0,
  });

  const openedAt = now.toISOString();
  const trimmed = (value: string): string | null => {
    const next = value.trim();
    return next === "" ? null : next;
  };

  return {
    id: `case_${caseNo.replace(/-/g, "_").toLowerCase()}`,
    caseNo,
    title: draft.title.trim(),
    description:
      trimmed(draft.description) ??
      "Raised manually from the Work Manager. No detection signal is attached.",
    exceptionType: draft.exceptionType,
    detectedBy: "MANUAL",
    // Raised by hand on the floor, so there is no upstream record to trace to.
    sourceSystem: "Manual entry",
    sourceRecord: "—",
    status: owner ? "ASSIGNED" : "NEW",
    priorityBand: priority.band,
    priorityScore: priority.score,
    priorityFactors: priority.factors,
    escalationLevel: 0,
    plantCode: plant.code,
    materialCode: trimmed(draft.materialCode),
    materialDesc: trimmed(draft.materialDesc),
    customerCode: null,
    customerName: trimmed(draft.customerName),
    customerTier,
    supplierCode: null,
    supplierName: trimmed(draft.supplierName),
    revenueAtRisk,
    currency: "USD",
    kpiKey: KPI_BY_EXCEPTION[draft.exceptionType],
    baselineValue: 0,
    targetValue: 0,
    measurementWindowDays: KPI_MEASUREMENT_WINDOW_DAYS,
    ownerId: owner?.id ?? null,
    openedAt,
    assignedAt: owner ? openedAt : null,
    dueAt: dueAtFor(priority.band, openedAt),
    slaBreachedAt: null,
    verifiedAt: null,
    closedAt: null,
    recurrenceCount: 1,
    lastDetectedAt: openedAt,
    playbookId: null,
    owner,
    plant,
    openActionCount: 0,
    totalActionCount: 0,
  };
}

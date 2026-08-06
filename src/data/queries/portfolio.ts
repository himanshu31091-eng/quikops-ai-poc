import { isOpenStatus, statusGroupOf } from "@/src/domain/case-status";
import type {
  CaseListItem,
  ExecutionMetrics,
  InventoryHealthRow,
  PlantHealth,
  RevenueImpactBucket,
} from "@/src/domain/types";
import { PRIORITY_BANDS } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { CASES } from "../fixtures/cases";
import {
  EXECUTION_METRICS,
  INVENTORY_HEALTH,
  PLANT_HEALTH,
  REVENUE_IMPACT,
} from "../fixtures/metrics";
import { toCaseListItem } from "./case-mapper";

/**
 * Portfolio data access.
 *
 * The Copilot on the Executive Dashboard answers about the whole operation
 * rather than one case, so it needs the same aggregate the dashboard renders —
 * assembled server-side, for the same reason the case record is: a client may
 * ask a question, it may not supply the facts.
 *
 * Same contract as every other query module: async, finished view model,
 * fixture read swappable for a real query without touching a caller.
 */

const HOUR_MS = 3_600_000;

export interface PortfolioTotals {
  totalCases: number;
  openCases: number;
  revenueAtRisk: number;
  currency: string;
  criticalOpen: number;
  highOpen: number;
  breachedOpen: number;
  unassignedOpen: number;
  pendingVerification: number;
  recurringOpen: number;
  escalatedOpen: number;
}

export interface SupplierExposure {
  supplierName: string;
  openCases: number;
  revenueAtRisk: number;
  maxRecurrence: number;
}

export interface PortfolioSnapshot {
  generatedAt: string;
  totals: PortfolioTotals;
  /** Open cases only, highest priority first. The working set. */
  openCases: CaseListItem[];
  byBand: { band: string; count: number; revenueAtRisk: number }[];
  byStatusGroup: { group: string; count: number }[];
  plants: PlantHealth[];
  metrics: ExecutionMetrics;
  revenueImpact: RevenueImpactBucket[];
  inventory: InventoryHealthRow[];
  /** Suppliers with more than one open case — the commercial escalation view. */
  supplierExposure: SupplierExposure[];
}

/** Suppliers carrying more than one open case, worst exposure first. */
function buildSupplierExposure(open: CaseListItem[]): SupplierExposure[] {
  const bySupplier = new Map<string, SupplierExposure>();

  for (const item of open) {
    if (!item.supplierName) continue;
    const entry = bySupplier.get(item.supplierName) ?? {
      supplierName: item.supplierName,
      openCases: 0,
      revenueAtRisk: 0,
      maxRecurrence: 0,
    };
    entry.openCases += 1;
    entry.revenueAtRisk += item.revenueAtRisk;
    entry.maxRecurrence = Math.max(entry.maxRecurrence, item.recurrenceCount);
    bySupplier.set(item.supplierName, entry);
  }

  return [...bySupplier.values()]
    .filter((entry) => entry.openCases > 1)
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const all = CASES.map(toCaseListItem);
  const open = all
    .filter((item) => isOpenStatus(item.status))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const byBand = PRIORITY_BANDS.map((band) => {
    const matching = open.filter((item) => item.priorityBand === band);
    return {
      band,
      count: matching.length,
      revenueAtRisk: matching.reduce((sum, item) => sum + item.revenueAtRisk, 0),
    };
  });

  const groupCounts = new Map<string, number>();
  for (const item of open) {
    const group = statusGroupOf(item.status);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  }

  return {
    generatedAt: DEMO_NOW.toISOString(),
    totals: {
      totalCases: all.length,
      openCases: open.length,
      revenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
      currency: open[0]?.currency ?? "USD",
      criticalOpen: open.filter((item) => item.priorityBand === "CRITICAL").length,
      highOpen: open.filter((item) => item.priorityBand === "HIGH").length,
      breachedOpen: open.filter((item) => item.slaBreachedAt !== null).length,
      unassignedOpen: open.filter((item) => item.ownerId === null).length,
      pendingVerification: open.filter((item) => item.status === "PENDING_VERIFY").length,
      recurringOpen: open.filter((item) => item.recurrenceCount > 1).length,
      escalatedOpen: open.filter((item) => item.escalationLevel > 0).length,
    },
    openCases: open,
    byBand,
    byStatusGroup: [...groupCounts.entries()].map(([group, count]) => ({ group, count })),
    plants: PLANT_HEALTH,
    metrics: EXECUTION_METRICS,
    revenueImpact: REVENUE_IMPACT,
    inventory: INVENTORY_HEALTH,
    supplierExposure: buildSupplierExposure(open),
  };
}

/** Hours a case has been open, for the rendered context. */
export function ageHours(openedAt: string): number {
  return Math.round((DEMO_NOW.getTime() - new Date(openedAt).getTime()) / HOUR_MS);
}

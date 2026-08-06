import type { CaseListItem, Plant, User } from "@/src/domain/types";
import { CASES } from "../fixtures/cases";
import { PLANTS } from "../fixtures/organisation";
import { EXECUTION_METRICS } from "../fixtures/metrics";
import { assignableUsers, toCaseListItem } from "./case-mapper";

/**
 * Work Manager data access.
 *
 * Same contract as the dashboard queries: every function is async and returns a
 * fully-formed view model, so replacing the fixture read with a Prisma query
 * against Neon touches this file only.
 *
 * Deliberately *not* returning pre-filtered or pre-aggregated sets. The module
 * filters, sorts and aggregates on the client so that a filter change costs one
 * memoised pass instead of a server round trip; the KPI header, table, board and
 * quick stats then always agree because they read the same array.
 */

export interface WorkPortfolioMetrics {
  /** Portfolio mean time to resolve, as reported on the Executive Dashboard. */
  mttrHours: number;
  mttrDeltaPct: number;
  slaAdherencePct: number;
  verificationPassRatePct: number;
}

export interface WorkManagerData {
  cases: CaseListItem[];
  plants: Plant[];
  assignableUsers: User[];
  portfolio: WorkPortfolioMetrics;
}

export async function getWorkManagerData(): Promise<WorkManagerData> {
  const cases = CASES.map(toCaseListItem).sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    cases,
    plants: PLANTS,
    assignableUsers: assignableUsers(),
    portfolio: {
      mttrHours: EXECUTION_METRICS.mttrHours,
      mttrDeltaPct: EXECUTION_METRICS.mttrDeltaPct,
      slaAdherencePct: EXECUTION_METRICS.slaAdherencePct,
      verificationPassRatePct: EXECUTION_METRICS.verificationPassRatePct,
    },
  };
}

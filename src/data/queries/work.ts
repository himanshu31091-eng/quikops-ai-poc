import { ALL_PLANTS, scopeCases, type PlantScope } from "@/src/scope/plant-scope";
import type { CaseListItem, Plant, User } from "@/src/domain/types";
import { CASES } from "../fixtures/cases";
import { PLANTS } from "../fixtures/organisation";
import { EXECUTION_METRICS } from "../fixtures/metrics";
import { assignableUsers, toCaseListItem } from "./case-mapper";
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { DEMO_NOW } from "@/src/lib/constants";
import { USE_DATABASE } from "../db";
import {
  findAssignableUsersForTenant,
  findCasesForTenant,
  findPlantsForTenant,
} from "./case-db-mapper";

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

export async function getWorkManagerData(
  scope: PlantScope = ALL_PLANTS,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<WorkManagerData> {
  // The first screen to read Neon. Fixtures remain the default: the database
  // path runs only when USE_DATABASE is explicitly true, so an unconfigured
  // environment behaves exactly as it did before. Plant scoping is applied to
  // the result the same way for both sources, so the filter cannot diverge.
  if (USE_DATABASE) {
    const [dbCases, dbPlants, dbUsers] = await Promise.all([
      findCasesForTenant(tenantId, DEMO_NOW),
      findPlantsForTenant(tenantId),
      findAssignableUsersForTenant(tenantId),
    ]);

    return {
      cases: scopeCases(dbCases, scope).sort((a, b) => b.priorityScore - a.priorityScore),
      plants: dbPlants,
      assignableUsers: dbUsers,
      portfolio: {
        mttrHours: EXECUTION_METRICS.mttrHours,
        mttrDeltaPct: EXECUTION_METRICS.mttrDeltaPct,
        slaAdherencePct: EXECUTION_METRICS.slaAdherencePct,
        verificationPassRatePct: EXECUTION_METRICS.verificationPassRatePct,
      },
    };
  }

  const cases = scopeCases(CASES, scope).map(toCaseListItem).sort((a, b) => b.priorityScore - a.priorityScore);

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

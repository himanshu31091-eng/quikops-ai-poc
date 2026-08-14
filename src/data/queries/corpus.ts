import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import type { CaseListItem, Plant, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { USE_DATABASE } from "../db";
import { CASES } from "../fixtures/cases";
import { PLANTS } from "../fixtures/organisation";
import {
  findAssignableUsersForTenant,
  findCasesForTenant,
  findPlantsForTenant,
} from "./case-db-mapper";
import { assignableUsers, toCaseListItem } from "./case-mapper";

/**
 * The one place a screen gets the case corpus.
 *
 * Before this existed, eleven query modules each imported `CASES` directly.
 * Work Manager and Case Detail were migrated to Neon; the other nine were not,
 * so with the database on, the Dashboard counted eight fixture cases above a
 * queue showing three real ones. Two screens disagreeing about how many cases
 * exist is not a rendering bug — it is the product telling a client its numbers
 * cannot be trusted.
 *
 * Every screen now reads through here, so there is exactly one answer to "what
 * cases are there" per request, whichever source is behind it.
 *
 * Both branches return the same view model, so callers cannot tell which ran —
 * and `USE_DATABASE=false` still reaches the fixtures untouched.
 */
export async function getCaseCorpus(tenantId: string = DEFAULT_TENANT_ID): Promise<CaseListItem[]> {
  if (USE_DATABASE) return findCasesForTenant(tenantId, DEMO_NOW);
  return CASES.map(toCaseListItem);
}

/** The people a case can be routed to, from whichever source is active. */
export async function getPeople(tenantId: string = DEFAULT_TENANT_ID): Promise<User[]> {
  if (USE_DATABASE) return findAssignableUsersForTenant(tenantId);
  return assignableUsers();
}

/** The tenant's sites. */
export async function getPlants(tenantId: string = DEFAULT_TENANT_ID): Promise<Plant[]> {
  if (USE_DATABASE) return findPlantsForTenant(tenantId);
  return PLANTS;
}

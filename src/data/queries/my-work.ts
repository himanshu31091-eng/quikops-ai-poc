import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import type { ActionItem, CaseListItem, User } from "@/src/domain/types";
import { USE_DATABASE } from "../db";
import { TODAYS_ACTIONS } from "../fixtures/intelligence";
import { EXECUTION_METRICS } from "../fixtures/metrics";
import { getCaseCorpus, getPeople } from "./corpus";
import { findActionsForOwner } from "./portfolio-db-mapper";

/**
 * My Work data access.
 *
 * Returns the whole owned set rather than a pre-filtered one: the page folds in
 * session outcomes on the client, so a case reassigned to someone else during
 * this session has to be able to leave the list, and one assigned to the
 * signed-in user has to be able to join it. Filtering here would make both
 * impossible.
 */

export interface MyWorkData {
  /** Every case in the store, projected and filtered on the client. */
  cases: CaseListItem[];
  /** Corrective actions seeded against the signed-in user. */
  actions: ActionItem[];
  assignableUsers: User[];
  portfolioMttrHours: number;
}

export async function getMyWorkData(userId: string): Promise<MyWorkData> {
  const [corpus, people] = await Promise.all([getCaseCorpus(), getPeople()]);
  const cases = [...corpus].sort((a, b) => b.priorityScore - a.priorityScore);

  // The seeded action list is keyed to fixture people. In database mode the
  // signed-in persona resolves to a Neon user whose actions are real rows, so
  // reading the fixture list there would show one person another's work.
  const actions = USE_DATABASE
    ? await findActionsForOwner(DEFAULT_TENANT_ID, userId, cases)
    : TODAYS_ACTIONS.filter((action) => action.ownerId === userId);

  return {
    cases,
    actions,
    assignableUsers: people,
    portfolioMttrHours: EXECUTION_METRICS.mttrHours,
  };
}

import type { ActionItem, CaseListItem, User } from "@/src/domain/types";
import { CASES } from "../fixtures/cases";
import { TODAYS_ACTIONS } from "../fixtures/intelligence";
import { EXECUTION_METRICS } from "../fixtures/metrics";
import { assignableUsers, toCaseListItem } from "./case-mapper";

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
  return {
    cases: CASES.map(toCaseListItem).sort((a, b) => b.priorityScore - a.priorityScore),
    actions: TODAYS_ACTIONS.filter((action) => action.ownerId === userId),
    assignableUsers: assignableUsers(),
    portfolioMttrHours: EXECUTION_METRICS.mttrHours,
  };
}

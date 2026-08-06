import type { CaseListItem, User, UserRole } from "@/src/domain/types";
import { CASES } from "../fixtures/cases";
import { PLANT_BY_CODE, USER_BY_ID, USERS } from "../fixtures/organisation";

/**
 * Shared read helpers for the case tables.
 *
 * Every query module needs the same two things — a stored case joined to its
 * owner and plant, and the list of people a case can be routed to. Keeping one
 * copy means the join and the routing rule change in one place when Neon
 * replaces the fixtures.
 */

export type StoredCase = (typeof CASES)[number];

/** Joins a stored case to its display-side relations. */
export function toCaseListItem(source: StoredCase): CaseListItem {
  return {
    ...source,
    owner: source.ownerId ? (USER_BY_ID[source.ownerId] ?? null) : null,
    plant: PLANT_BY_CODE[source.plantCode]!,
  };
}

/** Roles that can be handed a case. Executives sponsor work; they do not own it. */
const ASSIGNABLE_ROLES = new Set<UserRole>(["OPS_MANAGER", "TASK_OWNER", "ANALYST"]);

export function assignableUsers(): User[] {
  return USERS.filter((user) => user.isActive && ASSIGNABLE_ROLES.has(user.role));
}

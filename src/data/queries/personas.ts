import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import type { User } from "@/src/domain/types";
import { USE_DATABASE } from "../db";
import { DEMO_PERSONAS, USER_BY_ID } from "../fixtures/organisation";
import { getPrisma } from "../db";
import { toUser } from "./case-detail-db-mapper";

/**
 * The people a visitor may sign in as.
 *
 * In database mode this is the tenant's own directory, not the fixture cast.
 * That is not cosmetic: a persona the tenant does not have resolves to nobody,
 * the session is treated as stale, and the evaluator is bounced back to the
 * login screen they just used. Reading the list from the same place the
 * session is resolved from means every offered persona can actually sign in.
 *
 * One per role, ordered the way the workflow runs — who sponsors, who triages,
 * who owns the work, who reviews it, who administers the platform — because
 * the login screen is where an evaluator first learns the roles exist.
 */
const ROLE_ORDER = ["EXECUTIVE", "OPS_MANAGER", "TASK_OWNER", "ANALYST", "ADMINISTRATOR"] as const;

export async function getSignInPersonas(
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<User[]> {
  if (!USE_DATABASE) {
    return DEMO_PERSONAS.map((id) => USER_BY_ID[id]).filter((user): user is User => Boolean(user));
  }

  const rows = await getPrisma().user.findMany({
    where: { tenantId, isActive: true, personaKey: { not: null } },
    orderBy: { name: "asc" },
  });
  const people = rows.map(toUser);

  // One representative per role, so the switcher shows the workflow rather
  // than the whole directory. A tenant missing a role simply omits it.
  const chosen: User[] = [];
  for (const role of ROLE_ORDER) {
    const match = people.find((user) => user.role === role);
    if (match) chosen.push(match);
  }
  /* The reviewer has to be reachable, not merely named: verification tells the
   * reader "only <reviewer> can record this decision", and an evaluator who
   * cannot switch to them is stranded one step before the decision the
   * workflow exists to demonstrate. Any second operations manager is added for
   * exactly that reason. */
  const reviewer = people.find(
    (user) => user.role === "OPS_MANAGER" && !chosen.some((entry) => entry.id === user.id),
  );
  if (reviewer) chosen.push(reviewer);

  return chosen;
}

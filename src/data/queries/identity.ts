import type { User } from "@/src/domain/types";
import { getPrisma } from "../db";
import { toUser } from "./case-detail-db-mapper";

/**
 * Who a demo persona is, in the database.
 *
 * The POC signs in by choosing a persona, and the session cookie carries that
 * persona's key — `usr_aiyer`, not a database id. Fixtures resolve it directly
 * because the persona *is* the fixture row. The database cannot: its people
 * carry generated ids, so until this lookup existed a signed-in session named
 * somebody who matched no row, and nothing done in database mode could be
 * attributed to a person. Ownership, audit authorship and both sides of a
 * verification all depend on this resolving.
 *
 * Scoped to a tenant on every call, never global. Two tenants may expose the
 * same persona key and they must resolve to different people — an evaluator's
 * "reviewer" is not the demo tenant's reviewer, and a lookup that forgot the
 * tenant would be a cross-tenant identity leak rather than a convenience.
 *
 * Returns null rather than throwing: a persona that names nobody in this
 * tenant is a real answer, and the caller decides what it means.
 */
export async function findUserByPersona(
  tenantId: string,
  personaKey: string,
): Promise<User | null> {
  const row = await getPrisma().user.findFirst({
    where: { tenantId, personaKey, isActive: true },
  });
  return row ? toUser(row) : null;
}

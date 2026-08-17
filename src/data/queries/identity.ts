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

/**
 * Resolves whatever the session cookie happens to hold.
 *
 * The cookie carries a persona key in fixture mode and a database id in
 * database mode, because the sign-in screen offers whatever the tenant's
 * directory gave it. Accepting both is what stops that difference becoming a
 * sign-in loop: the cookie was written, the guard could not resolve it, and
 * the redirect went back to the screen that had just written it.
 *
 * Both branches are scoped to the tenant, so widening what may be matched
 * does not widen what may be reached.
 */
export async function findUserBySessionRef(
  tenantId: string,
  ref: string,
): Promise<User | null> {
  const row = await getPrisma().user.findFirst({
    where: { tenantId, isActive: true, OR: [{ personaKey: ref }, { id: ref }] },
  });
  return row ? toUser(row) : null;
}

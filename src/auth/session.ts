import { cookies } from "next/headers";
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { USE_DATABASE } from "@/src/data/db";
import { DEFAULT_SESSION_USER_ID, USER_BY_ID } from "@/src/data/fixtures/organisation";
import { findUserByPersona } from "@/src/data/queries/identity";
import type { User } from "@/src/domain/types";

const SESSION_COOKIE = "qo_persona";

/**
 * The signed-in persona, or `null` when no session cookie is set — or when it
 * names a user that no longer exists, which is how a stale cookie from an
 * earlier fixture set is discarded rather than trusted.
 *
 * In database mode the persona key is resolved against the tenant's people
 * rather than the fixtures, so the session names somebody the database can
 * attribute work to. A persona that matches no row is treated exactly like a
 * stale cookie: null, and the route guard sends the request to `/login`. It
 * deliberately does **not** fall back to the fixture user of the same name —
 * signing somebody in as an identity the database has never heard of is how an
 * audit trail becomes fiction.
 *
 * Route guards use this. Screens use `getSessionUser`.
 */
export async function getActiveSessionUser(): Promise<User | null> {
  const store = await cookies();
  const personaId = store.get(SESSION_COOKIE)?.value;
  if (!personaId) return null;

  if (USE_DATABASE) return findUserByPersona(DEFAULT_TENANT_ID, personaId);

  return USER_BY_ID[personaId] ?? null;
}

/**
 * POC session. Reads the active persona from a cookie so the role switcher
 * survives a full page load. Production replaces this with an Entra ID OIDC
 * session; every consumer depends only on the returned `User`, so the swap is
 * contained to this file.
 *
 * The default-persona fallback keeps the return type non-nullable for the
 * screens; the `(app)` layout guard is what stops it ever being reached, by
 * sending an unauthenticated request to `/login` first.
 */
export async function getSessionUser(): Promise<User> {
  const active = await getActiveSessionUser();
  if (active) return active;

  if (USE_DATABASE) {
    const fallback = await findUserByPersona(DEFAULT_TENANT_ID, DEFAULT_SESSION_USER_ID);
    if (fallback) return fallback;
    // Reached only if the tenant carries no personas at all, which is a
    // configuration fault rather than a data condition. Saying so beats
    // rendering the whole portal as a fixture person who does not exist in the
    // database everything else on screen was read from.
    throw new Error(
      `Database mode is on, but tenant "${DEFAULT_TENANT_ID}" has no user for persona "${DEFAULT_SESSION_USER_ID}". Run the seed, or unset USE_DATABASE.`,
    );
  }

  return USER_BY_ID[DEFAULT_SESSION_USER_ID]!;
}

export { SESSION_COOKIE };

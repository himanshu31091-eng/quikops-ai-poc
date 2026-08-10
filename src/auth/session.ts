import { cookies } from "next/headers";
import { DEFAULT_SESSION_USER_ID, USER_BY_ID } from "@/src/data/fixtures/organisation";
import type { User } from "@/src/domain/types";

const SESSION_COOKIE = "qo_persona";

/**
 * The signed-in persona, or `null` when no session cookie is set — or when it
 * names a user that no longer exists, which is how a stale cookie from an
 * earlier fixture set is discarded rather than trusted.
 *
 * Route guards use this. Screens use `getSessionUser`.
 */
export async function getActiveSessionUser(): Promise<User | null> {
  const store = await cookies();
  const personaId = store.get(SESSION_COOKIE)?.value;
  return (personaId ? USER_BY_ID[personaId] : undefined) ?? null;
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
  return (await getActiveSessionUser()) ?? USER_BY_ID[DEFAULT_SESSION_USER_ID]!;
}

export { SESSION_COOKIE };

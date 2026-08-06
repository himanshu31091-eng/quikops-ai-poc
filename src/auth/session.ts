import { cookies } from "next/headers";
import { DEFAULT_SESSION_USER_ID, USER_BY_ID } from "@/src/data/fixtures/organisation";
import type { User } from "@/src/domain/types";

const SESSION_COOKIE = "qo_persona";

/**
 * POC session. Reads the active persona from a cookie so the role switcher
 * survives a full page load. Production replaces this with an Entra ID OIDC
 * session; every consumer depends only on the returned `User`, so the swap is
 * contained to this file.
 */
export async function getSessionUser(): Promise<User> {
  const store = await cookies();
  const personaId = store.get(SESSION_COOKIE)?.value;
  return (
    (personaId ? USER_BY_ID[personaId] : undefined) ??
    USER_BY_ID[DEFAULT_SESSION_USER_ID]!
  );
}

export { SESSION_COOKIE };

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { USER_BY_ID } from "@/src/data/fixtures/organisation";
import { SESSION_COOKIE } from "./session";

/**
 * Server actions that write the session cookie.
 *
 * The persona switcher is how the demo changes role without a login screen.
 * The cookie is `httpOnly`, so the identity the server reads can never be set
 * from the browser — the client asks for a switch, it does not perform one.
 */
const ONE_DAY_SECONDS = 60 * 60 * 24;

export async function switchPersona(userId: string): Promise<void> {
  if (!USER_BY_ID[userId]) return;
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
  });
  revalidatePath("/", "layout");
}

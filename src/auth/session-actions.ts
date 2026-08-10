"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROLE_LANDING } from "@/src/config/app-config";
import { USER_BY_ID } from "@/src/data/fixtures/organisation";
import { SESSION_COOKIE } from "./session";

/**
 * Server actions that own the session cookie. Sign-in, the in-app persona
 * switch and sign-out are three doors onto one mechanism — none of them writes
 * identity anywhere else.
 *
 * The cookie is `httpOnly`, so the identity the server reads can never be set
 * from the browser — the client asks for a switch, it does not perform one.
 */
const ONE_DAY_SECONDS = 60 * 60 * 24;

async function writeSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
  });
  // The app layout renders from the persona, so every segment under it is stale.
  revalidatePath("/", "layout");
}

/**
 * The demo role switcher. Rewrites the session and stays where the presenter
 * is, which is the point of it — the same screen, seen as someone else.
 */
export async function switchPersona(userId: string): Promise<void> {
  if (!USER_BY_ID[userId]) return;
  await writeSessionCookie(userId);
}

/**
 * Sign-in from the persona chooser. Writes the session and *navigates*.
 *
 * The redirect is the load-bearing half. Without it the cookie was set and the
 * browser stayed on `/login`, so a second sign-in after a sign-out looked like
 * a dead card: the session was real, the screen just never changed.
 */
export async function signInAsPersona(userId: string): Promise<void> {
  const user = USER_BY_ID[userId];
  if (!user) redirect("/login");
  await writeSessionCookie(userId);
  redirect(ROLE_LANDING[user.role]);
}

/**
 * Sign-out. Clears the session before returning to the chooser, so the next
 * persona is selected against no session rather than the previous one.
 */
export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}

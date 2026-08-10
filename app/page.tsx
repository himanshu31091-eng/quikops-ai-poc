import { redirect } from "next/navigation";
import { getActiveSessionUser } from "@/src/auth/session";
import { ROLE_LANDING } from "@/src/config/app-config";

/**
 * The app has no marketing root. `/` resolves to the signed-in role's landing
 * screen, or to the persona chooser when there is no session — so opening the
 * app after a sign-out lands somewhere a signed-out visitor belongs.
 */
export default async function RootPage() {
  const user = await getActiveSessionUser();
  redirect(user ? ROLE_LANDING[user.role] : "/login");
}

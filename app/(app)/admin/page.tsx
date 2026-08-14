import { redirect } from "next/navigation";
import { canRoleOpen, ROLE_LANDING } from "@/src/config/app-config";
import { getSessionUser } from "@/src/auth/session";
import { getAdministrationData } from "@/src/data/queries/administration";
import { AdministrationView } from "@/features/administration/components/administration-view";

/**
 * Administration.
 *
 * Server component: users, roles, routing rules and connector registration are
 * all resolved here and passed down, so the client never asks for the org
 * chart. Routing rules are derived from the corpus rather than declared (D-55).
 */
export const metadata = {
  title: "Administration",
  description:
    "Users, roles, plant scoping, assignment routing rules, SLA thresholds and priority weight configuration.",
};

export default async function AdministrationPage() {
  // Checked on the server, before any data is read. The side navigation already
  // hides this entry from roles that may not use it, but hiding a link only
  // stops the people who were not going to type the address anyway.
  const user = await getSessionUser();
  if (!canRoleOpen(user.role, "/admin")) redirect(ROLE_LANDING[user.role]);

  const data = await getAdministrationData();
  return <AdministrationView data={data} />;
}

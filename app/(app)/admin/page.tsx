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
  const data = await getAdministrationData();
  return <AdministrationView data={data} />;
}

import { getSessionUser } from "@/src/auth/session";
import { getActionCenterData } from "@/src/data/queries/actions";
import { ActionCenterView } from "@/features/action-center/components/action-center-view";

export const metadata = {
  title: "Action Center",
  description:
    "Every corrective action across the network — assigned work, SLA warnings, approvals, escalations and AI recommendations in one queue.",
};

/**
 * Server component. Reads the actions and the context each drawer needs in one
 * pass, then hands both to the client module, which filters, sorts and paginates
 * locally so a filter change costs one memoised pass rather than a round trip.
 */
export default async function ActionCenterPage() {
  const [data, user] = await Promise.all([getActionCenterData(), getSessionUser()]);
  return <ActionCenterView data={data} sessionUser={user} />;
}

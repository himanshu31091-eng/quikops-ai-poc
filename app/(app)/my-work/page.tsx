import { getSessionUser } from "@/src/auth/session";
import { getMyWorkData } from "@/src/data/queries/my-work";
import { MyWorkView } from "@/features/my-work/components/my-work-view";

export const metadata = {
  title: "My Work",
  description: "Cases and corrective actions assigned to you, in priority order.",
};

/**
 * My Work. The owner's slice of the same queue the Work Manager shows.
 *
 * Server component: the owned set is read in one pass and folded against the
 * session's execution store on the client, so a case routed to you a moment ago
 * is already here.
 */
export default async function MyWorkPage() {
  const user = await getSessionUser();
  const data = await getMyWorkData(user.id);

  return <MyWorkView data={data} sessionUser={user} />;
}

import { getSessionUser } from "@/src/auth/session";
import { getWorkManagerData } from "@/src/data/queries/work";
import { WorkManagerView } from "@/features/work-manager/components/work-manager-view";
import {
  parseWorkParams,
  type RawSearchParams,
} from "@/features/work-manager/utils/query-state";

export const metadata = {
  title: "Work Manager",
  description:
    "Every operational case detected across the plant network, with triage, assignment, execution and verification in one queue.",
};

/**
 * Server component. Reads the data and the shareable view state out of the URL,
 * then hands both to the client module. Deep links from the Executive Dashboard
 * KPI cards (`/work?band=CRITICAL`, `/work?overdue=true`, `/work?sort=revenue`)
 * resolve here, so a number on the dashboard always opens the cases behind it.
 */
export default async function WorkManagerPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [params, user, data] = await Promise.all([
    searchParams,
    getSessionUser(),
    getWorkManagerData(),
  ]);

  const initialState = parseWorkParams(params, {
    plantCodes: data.plants.map((plant) => plant.code),
    userIds: data.assignableUsers.map((assignable) => assignable.id),
  });

  return (
    <WorkManagerView
      cases={data.cases}
      plants={data.plants}
      assignableUsers={data.assignableUsers}
      portfolio={data.portfolio}
      sessionUser={user}
      initialState={initialState}
    />
  );
}

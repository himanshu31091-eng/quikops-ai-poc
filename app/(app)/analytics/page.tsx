import { getAnalyticsData } from "@/src/data/queries/analytics";
import { AnalyticsView } from "@/features/analytics/components/analytics-view";

export const metadata = {
  title: "Execution Analytics",
  description:
    "Mean time to resolve, SLA adherence, verification pass rate and recurrence by plant, owner and exception type.",
};

/**
 * Server component. Reads the working set in one pass and hands it to the
 * client module, which filters and aggregates locally so a filter change costs
 * one memoised pass rather than a round trip.
 */
export default async function ExecutionAnalyticsPage() {
  const data = await getAnalyticsData();
  return <AnalyticsView data={data} />;
}

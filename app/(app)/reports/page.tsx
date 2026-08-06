import { getReportsData } from "@/src/data/queries/reports";
import { ReportsView } from "@/features/reports/components/reports-view";

/**
 * Reports.
 *
 * Report definitions are resolved on the server and rendered from the live
 * corpus, so an exported report and the screen it came from cannot disagree.
 * Delivery scheduling is a Phase-2 item (see ROADMAP.md).
 */
export const metadata = {
  title: "Reports",
  description:
    "Scheduled executive and audit reporting with PDF and CSV distribution to stakeholder lists.",
};

export default async function ReportsPage() {
  const data = await getReportsData();
  return <ReportsView data={data} />;
}

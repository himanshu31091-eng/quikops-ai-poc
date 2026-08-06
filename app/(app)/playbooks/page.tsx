import { getPlaybookLibraryData } from "@/src/data/queries/playbooks";
import { PlaybooksView } from "@/features/playbooks/components/playbooks-view";

/**
 * The Playbook library.
 *
 * Reads `PLAYBOOK_LIBRARY`, which is the same data the corrective-action
 * generator runs. A library describing plays the engine does not run would be
 * documentation, not configuration.
 */
export const metadata = {
  title: "Playbooks",
  description:
    "Reusable corrective-action templates per exception type, with usage counts, average resolution time and measured effectiveness.",
};

export default async function PlaybooksPage() {
  const data = await getPlaybookLibraryData();
  return <PlaybooksView data={data} />;
}

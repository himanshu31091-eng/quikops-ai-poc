import { getAuditLogData } from "@/src/data/queries/audit";
import { AuditLogView } from "@/features/audit-log/components/audit-log-view";

export const metadata = {
  title: "Audit Log",
  description:
    "Append-only record of every state change, assignment, verification decision and configuration edit, with actor and timestamp.",
};

/** Server component. Assembles the network-wide trail in one pass. */
export default async function AuditLogPage() {
  const data = await getAuditLogData();
  return <AuditLogView data={data} />;
}

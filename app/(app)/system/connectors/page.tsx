import { getSessionUser } from "@/src/auth/session";
import { getConnectorHealthData } from "@/src/data/queries/connectors";
import { ConnectorHealthView } from "@/features/connector-health/components/connector-health-view";

export const metadata = {
  title: "Connector Health",
  description:
    "Every Angle ingestion status, run history, deduplication counts and dead-letter replay for failed signals.",
};

/**
 * Server component. Reads the connector state and scores health in one pass,
 * then hands it to the client module, which filters and folds in this session's
 * replays locally.
 */
export default async function ConnectorHealthPage() {
  const [data, user] = await Promise.all([getConnectorHealthData(), getSessionUser()]);
  return <ConnectorHealthView data={data} sessionUser={user} />;
}

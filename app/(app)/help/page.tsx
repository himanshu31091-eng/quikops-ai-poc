import { HelpCenterView } from "@/features/help/components/help-center-view";

/**
 * The Help Centre.
 *
 * Static by design — the content is the same for every user, so there is no
 * session read here and the route prerenders. Search runs in the browser over
 * the same catalogue the per-screen doc panels use.
 */
export const metadata = {
  title: "Help Center",
  description:
    "How QuikOps AI works, what each screen is for, keyboard shortcuts, the AI Copilot guide, data sources and troubleshooting.",
};

export default function HelpCenterPage() {
  return <HelpCenterView />;
}

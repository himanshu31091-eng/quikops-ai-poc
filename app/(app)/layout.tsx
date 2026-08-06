import { AppShell } from "@/components/shell/app-shell";
import { getSessionUser } from "@/src/auth/session";
import { CASES } from "@/src/data/fixtures/cases";
import { DEMO_PERSONAS, PLANTS, USER_BY_ID } from "@/src/data/fixtures/organisation";
import { NOTIFICATIONS } from "@/src/data/fixtures/intelligence";
import { getNavBadgeCounts } from "@/src/data/queries/dashboard";
import { ExecutionProvider } from "@/src/workflow/execution-store";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, badges] = await Promise.all([getSessionUser(), getNavBadgeCounts()]);

  const personas = DEMO_PERSONAS.map((id) => USER_BY_ID[id]!).filter(Boolean);

  const searchableCases = CASES.filter((c) =>
    ["NEW", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "PENDING_VERIFY", "REOPENED"].includes(
      c.status,
    ),
  )
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((c) => ({
      caseNo: c.caseNo,
      title: c.title,
      plantCode: c.plantCode,
      priorityBand: c.priorityBand,
    }));

  return (
    // The execution store lives on the layout, not a page: outcomes recorded on
    // a case have to survive the navigation back to the queue and the dashboard.
    <ExecutionProvider>
      <AppShell
        user={user}
        personas={personas}
        plants={PLANTS}
        badges={badges}
        notifications={NOTIFICATIONS}
        searchableCases={searchableCases}
      >
        {children}
      </AppShell>
    </ExecutionProvider>
  );
}

import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";
import { TourInvitation, TourOverlay } from "@/components/tour/tour-overlay";
import { getSessionUser } from "@/src/auth/session";
import { CASES } from "@/src/data/fixtures/cases";
import { DEMO_PERSONAS, PLANTS, USER_BY_ID } from "@/src/data/fixtures/organisation";
import { NOTIFICATIONS } from "@/src/data/fixtures/intelligence";
import { getNavBadgeCounts } from "@/src/data/queries/dashboard";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/src/i18n/config";
import { I18nProvider } from "@/src/i18n/provider";
import { TourProvider } from "@/src/tour/tour-store";
import { ExecutionProvider } from "@/src/workflow/execution-store";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, badges, cookieStore] = await Promise.all([
    getSessionUser(),
    getNavBadgeCounts(),
    cookies(),
  ]);

  const personas = DEMO_PERSONAS.map((id) => USER_BY_ID[id]!).filter(Boolean);

  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

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
    // Providers are ordered outermost-first by lifetime: locale outlives a
    // session's work, the execution store outlives a single screen, and the
    // tour reads the signed-in role from above it.
    <I18nProvider initialLocale={locale}>
      <ExecutionProvider>
        <TourProvider role={user.role}>
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
          <TourOverlay />
          <TourInvitation />
        </TourProvider>
      </ExecutionProvider>
    </I18nProvider>
  );
}

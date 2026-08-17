import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { TourInvitation, TourOverlay } from "@/components/tour/tour-overlay";
import { getActiveSessionUser } from "@/src/auth/session";
import { getPlantScope } from "@/src/scope/plant-scope";
import { CASES } from "@/src/data/fixtures/cases";
import { PLANTS } from "@/src/data/fixtures/organisation";
import { getSignInPersonas } from "@/src/data/queries/personas";
import { NOTIFICATIONS } from "@/src/data/fixtures/intelligence";
import { getNavBadgeCounts } from "@/src/data/queries/dashboard";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/src/i18n/config";
import { loadMessages } from "@/src/i18n/load";
import { I18nProvider } from "@/src/i18n/provider";
import { TourProvider } from "@/src/tour/tour-store";
import { ExecutionProvider } from "@/src/workflow/execution-store";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The one guard for the whole authenticated tree. Signing out clears the
  // cookie, so a back-button return to a shell screen lands on the chooser
  // instead of re-rendering the previous persona's work.
  const user = await getActiveSessionUser();
  if (!user) redirect("/login");

  const [badges, cookieStore, plantScope] = await Promise.all([
    getNavBadgeCounts(),
    cookies(),
    getPlantScope(),
  ]);

  const personas = await getSignInPersonas();

  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  // Resolved on the server so the first HTML is already in the right language.
  const messages = await loadMessages(locale);

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
    <I18nProvider initialLocale={locale} initialMessages={messages}>
      <ExecutionProvider>
        <TourProvider role={user.role}>
          <AppShell
            user={user}
            personas={personas}
            plants={PLANTS}
            badges={badges}
            plantScope={plantScope}
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

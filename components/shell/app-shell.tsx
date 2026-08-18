"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import type { Plant, User } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import { Breadcrumbs } from "./breadcrumbs";
import { DemoModeBadge } from "./demo-mode-badge";
import { GlobalSearch, type SearchableCase } from "./global-search";
import { NotificationTray, type NotificationModel } from "./notification-tray";
import { PlantScopeSelector } from "./plant-scope-selector";
import { SideNav } from "./side-nav";
import { PlatformControls } from "@/components/shell/platform-controls";
import { SkipLink } from "@/components/patterns/skip-link";
import { useFocusTrap } from "@/src/a11y/use-focus-trap";
import { UserMenu } from "./user-menu";
import { useTranslation } from "@/src/i18n/provider";

/**
 * The application frame: side navigation, top bar, and the content slot.
 *
 * Every prop here is server-resolved and passed down once. The shell holds no
 * data of its own — it is the only client component high enough to own the
 * mobile-nav open state, and that is all it owns.
 */
interface AppShellProps {
  user: User;
  personas: User[];
  plants: Plant[];
  badges: Record<string, number>;
  /** Resolved on the server so the control and the data never disagree. */
  plantScope: string;
  notifications: NotificationModel[];
  searchableCases: SearchableCase[];
  /** Tenant identity, resolved on the server: the badge cannot read the env. */
  environmentLabel: string;
  dataDisclosure: string;
  children: React.ReactNode;
}

export function AppShell({
  user,
  personas,
  plants,
  badges,
  plantScope,
  notifications,
  searchableCases,
  environmentLabel,
  dataDisclosure,
  children,
}: AppShellProps) {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const navTrapRef = useFocusTrap(mobileNavOpen);

  React.useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  // The drawer is a modal overlay and behaves like every other one in the
  // product: Escape closes it, and Tab stays inside it. Without this, opening
  // the nav on a small screen left focus on the page behind the scrim.
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      <SkipLink />
      {/* Persistent sidebar — lg and above */}
      <div className="sticky top-0 hidden h-dvh lg:block">
        <SideNav role={user.role} badges={badges} />
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("shell.navigation")}
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            aria-label={t("shell.closeNavigation")}
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-surface-inverse/25"
          />
          <div
            ref={navTrapRef as React.RefObject<HTMLDivElement>}
            className="anim-panel absolute left-0 top-0 h-full"
          >
            <SideNav
              role={user.role}
              badges={badges}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          Three zones with explicit shrink priorities, because a single flex row
          of greedy children is what crushed the breadcrumb to "H. > Exe…" while
          the search kept its full 448px.

          - left  : shrinks first and truncates. It is context, not the task.
          - centre: shrinks second, with a floor — a search box narrower than
                    its own placeholder is not a search box.
          - right : never shrinks. Identity, notifications and tenant scope are
                    the controls a user reaches for, and a control that has been
                    squeezed to nothing is worse than one that was never shown.

          `flex-nowrap` is deliberate: the header is a fixed height, so a wrap is
          not a graceful degradation here, it is a burst box overlapping the page.
        */}
        <header
          className={cn(
            "sticky top-0 z-40 flex h-topbar shrink-0 flex-nowrap items-center gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur-sm sm:gap-3 sm:px-4",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 md:min-w-24">
            <button
              type="button"
              aria-label={t("shell.openNavigation")}
              onClick={() => setMobileNavOpen(true)}
              className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 hover:bg-surface-hover lg:hidden"
            >
              <Icon name="PanelLeft" size="md" />
            </button>

            {/*
              A floor as well as a ceiling. `min-w-0` alone let this zone be
              driven to a width of exactly 0 once the right cluster and the
              search had taken their share — the trail was in the DOM, laid out,
              and 0px wide. Shrinking first is right; disappearing is not.
            */}
            <div className="hidden min-w-0 shrink overflow-hidden md:block">
              <Breadcrumbs />
            </div>
          </div>

          {/*
            Equal share with the left zone rather than double it, so the trail
            keeps a usable width at the middle sizes where both are visible. The
            floor stops the field becoming narrower than its own placeholder;
            `max-w-md` keeps the familiar desktop proportion.
          */}
          <div className="hidden min-w-40 max-w-md flex-1 md:block xl:min-w-44">
            <GlobalSearch cases={searchableCases} />
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {/* Search is a primary control, so it survives the breakpoint that
                drops the full field rather than disappearing with it. */}
            <div className="md:hidden">
              <GlobalSearch cases={searchableCases} compact />
            </div>
            <DemoModeBadge
              environmentLabel={environmentLabel}
              dataDisclosure={dataDisclosure}
            />
            <PlantScopeSelector plants={plants} scope={plantScope} />
            <PlatformControls />
            <NotificationTray items={notifications} />
            <div className="hidden h-5 w-px bg-line sm:block" />
            <UserMenu user={user} personas={personas} />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          <div className="mx-auto w-full min-w-0 max-w-content px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

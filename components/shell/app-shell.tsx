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
  children,
}: AppShellProps) {
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
          aria-label="Navigation"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            aria-label="Close navigation"
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
        <header
          className={cn(
            "sticky top-0 z-40 flex h-topbar shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-sm",
          )}
        >
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
            className="-ml-1 flex size-8 items-center justify-center rounded-md text-content-secondary transition-colors duration-150 hover:bg-surface-hover lg:hidden"
          >
            <Icon name="PanelLeft" size="md" />
          </button>

          <div className="hidden min-w-0 md:block">
            <Breadcrumbs />
          </div>

          <div className="mx-auto hidden w-full max-w-md md:block">
            <GlobalSearch cases={searchableCases} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DemoModeBadge />
            <div className="hidden xl:block">
              <PlantScopeSelector plants={plants} scope={plantScope} />
            </div>
            <PlatformControls />
            <NotificationTray items={notifications} />
            <div className="h-5 w-px bg-line" />
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

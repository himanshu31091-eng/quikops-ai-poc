"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import type { Plant, User } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import { Breadcrumbs } from "./breadcrumbs";
import { GlobalSearch, type SearchableCase } from "./global-search";
import { NotificationTray, type NotificationModel } from "./notification-tray";
import { PlantScopeSelector } from "./plant-scope-selector";
import { SideNav } from "./side-nav";
import { UserMenu } from "./user-menu";

interface AppShellProps {
  user: User;
  personas: User[];
  plants: Plant[];
  badges: Record<string, number>;
  notifications: NotificationModel[];
  searchableCases: SearchableCase[];
  children: React.ReactNode;
}

export function AppShell({
  user,
  personas,
  plants,
  badges,
  notifications,
  searchableCases,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Persistent sidebar — lg and above */}
      <div className="sticky top-0 hidden h-dvh lg:block">
        <SideNav role={user.role} badges={badges} />
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-surface-inverse/25"
          />
          <div className="anim-panel absolute left-0 top-0 h-full">
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
            <div className="hidden xl:block">
              <PlantScopeSelector plants={plants} />
            </div>
            <NotificationTray items={notifications} />
            <div className="h-5 w-px bg-line" />
            <UserMenu user={user} personas={personas} />
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full min-w-0 max-w-content px-4 py-5 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import type { UserRole } from "@/src/domain/types";
import { tourForRole, tourStorageKey, type TourDefinition, type TourStep } from "./tours";

/**
 * Tour state, mounted on the `(app)` layout.
 *
 * It lives at the layout because a tour walks across routes — the executive
 * tour starts on the dashboard and ends pointing at the analytics nav item, and
 * the manager tour crosses from the queue into the Action Center. A per-page
 * store would lose its place on the first navigation.
 *
 * Completion is the one piece of state that persists across a refresh
 * (`localStorage`), because a tour that reappears on every reload is not
 * onboarding, it is an obstacle.
 */

interface TourStore {
  tour: TourDefinition;
  isOpen: boolean;
  index: number;
  step: TourStep | null;
  /** True when the user has finished or skipped this role's tour before. */
  hasCompleted: boolean;
  start: () => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
  finish: () => void;
}

const TourContext = React.createContext<TourStore | null>(null);

export function TourProvider({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tour = React.useMemo(() => tourForRole(role), [role]);

  const [isOpen, setIsOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [hasCompleted, setHasCompleted] = React.useState(true);

  // Read completion after hydration so the server and first client render agree.
  React.useEffect(() => {
    try {
      setHasCompleted(window.localStorage.getItem(tourStorageKey(tour.id)) !== null);
    } catch {
      setHasCompleted(true);
    }
  }, [tour.id]);

  const step = isOpen ? (tour.steps[index] ?? null) : null;

  // A step can live on another route; navigate before it is shown.
  React.useEffect(() => {
    if (!step) return;
    if (step.route !== pathname) router.push(step.route);
  }, [step, pathname, router]);

  const markComplete = React.useCallback(() => {
    try {
      window.localStorage.setItem(tourStorageKey(tour.id), new Date().toISOString());
    } catch {
      /* private browsing — the tour simply offers itself again */
    }
    setHasCompleted(true);
  }, [tour.id]);

  const start = React.useCallback(() => {
    setIndex(0);
    setIsOpen(true);
  }, []);

  const next = React.useCallback(() => {
    setIndex((previous) => {
      if (previous >= tour.steps.length - 1) {
        setIsOpen(false);
        markComplete();
        return previous;
      }
      return previous + 1;
    });
  }, [tour.steps.length, markComplete]);

  const previous = React.useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const skip = React.useCallback(() => {
    setIsOpen(false);
    markComplete();
  }, [markComplete]);

  const finish = React.useCallback(() => {
    setIsOpen(false);
    markComplete();
  }, [markComplete]);

  const value = React.useMemo<TourStore>(
    () => ({ tour, isOpen, index, step, hasCompleted, start, next, previous, skip, finish }),
    [tour, isOpen, index, step, hasCompleted, start, next, previous, skip, finish],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

const FALLBACK: TourStore = {
  tour: tourForRole("OPS_MANAGER"),
  isOpen: false,
  index: 0,
  step: null,
  hasCompleted: true,
  start: () => undefined,
  next: () => undefined,
  previous: () => undefined,
  skip: () => undefined,
  finish: () => undefined,
};

/** Returns an inert store when no provider is mounted, so controls render safely. */
export function useTour(): TourStore {
  return React.useContext(TourContext) ?? FALLBACK;
}

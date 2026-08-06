"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { useTour } from "@/src/tour/tour-store";
import { cn } from "@/src/lib/cn";

/**
 * The tour spotlight and its popover.
 *
 * Positioned from the anchor element's own bounding box rather than a
 * positioning library — one element, one rectangle, recalculated on scroll and
 * resize. Adding Floating UI for this would be a dependency for four callouts.
 *
 * Uses `.anim-fade` only. No sixth animation was added for it, and the
 * `prefers-reduced-motion` rule in `globals.css` already covers it.
 */

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;
const CARD_WIDTH = 320;

function useAnchorRect(anchor: string | undefined): Rect | null {
  const [rect, setRect] = React.useState<Rect | null>(null);

  React.useEffect(() => {
    if (!anchor) {
      setRect(null);
      return;
    }

    const measure = () => {
      const node = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      if (!node) {
        setRect(null);
        return;
      }
      const box = node.getBoundingClientRect();
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      // Bring the anchor into view before the spotlight is drawn around it.
      if (box.top < 80 || box.bottom > window.innerHeight - 80) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // The step may navigate first; retry briefly until the anchor mounts.
    measure();
    const retries = [120, 320, 640].map((delay) => window.setTimeout(measure, delay));

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      for (const id of retries) window.clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchor]);

  return rect;
}

export function TourOverlay() {
  const { isOpen, step, index, tour, next, previous, skip } = useTour();
  const rect = useAnchorRect(step?.anchor);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, next, previous, skip]);

  if (!isOpen || !step) return null;

  const isLast = index === tour.steps.length - 1;

  // Placed beneath the anchor by default, flipping above when there is no room.
  const cardTop = rect
    ? step.placement === "top"
      ? Math.max(12, rect.top - 12)
      : rect.top + rect.height + 12
    : 120;
  const cardLeft = rect
    ? Math.min(
        Math.max(12, rect.left),
        (typeof window !== "undefined" ? window.innerWidth : 1280) - CARD_WIDTH - 12,
      )
    : 24;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${tour.name}: step ${index + 1} of ${tour.steps.length}`}
      className="anim-fade fixed inset-0 z-[80]"
    >
      {/* Scrim with a cut-out over the anchor, drawn as four panels so the
          highlighted element stays fully interactive underneath. */}
      {rect ? (
        <>
          <div
            className="fixed inset-x-0 top-0 bg-surface-inverse/45"
            style={{ height: Math.max(0, rect.top - PADDING) }}
          />
          <div
            className="fixed inset-x-0 bg-surface-inverse/45"
            style={{ top: rect.top + rect.height + PADDING, bottom: 0 }}
          />
          <div
            className="fixed bg-surface-inverse/45"
            style={{
              top: rect.top - PADDING,
              height: rect.height + PADDING * 2,
              left: 0,
              width: Math.max(0, rect.left - PADDING),
            }}
          />
          <div
            className="fixed bg-surface-inverse/45"
            style={{
              top: rect.top - PADDING,
              height: rect.height + PADDING * 2,
              left: rect.left + rect.width + PADDING,
              right: 0,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed rounded-md ring-2 ring-accent"
            style={{
              top: rect.top - PADDING,
              left: rect.left - PADDING,
              width: rect.width + PADDING * 2,
              height: rect.height + PADDING * 2,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-surface-inverse/45" />
      )}

      <div
        className={cn(
          "fixed w-80 rounded-lg border border-line bg-surface p-3.5 shadow-overlay",
          step.placement === "top" && "-translate-y-full",
        )}
        style={{ top: cardTop, left: cardLeft }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-accent">
            {tour.name} · {index + 1} of {tour.steps.length}
          </p>
          <button
            type="button"
            onClick={skip}
            aria-label="Skip tour"
            className="shrink-0 text-content-tertiary transition-colors duration-150 hover:text-content"
          >
            <Icon name="X" size="xs" />
          </button>
        </div>

        <h2 className="mt-1.5 text-sm font-semibold text-content">{step.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-content-secondary">{step.body}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" aria-hidden>
            {tour.steps.map((entry, dot) => (
              <span
                key={entry.id}
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-150",
                  dot === index ? "bg-accent" : "bg-line-strong",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={skip}>
              Skip
            </Button>
            {index > 0 ? (
              <Button variant="secondary" size="sm" onClick={previous}>
                <Icon name="ChevronLeft" size="xs" />
                Back
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={next}>
              {isLast ? "Finish" : "Next"}
              {isLast ? null : <Icon name="ChevronRight" size="xs" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Offers the tour on first visit; afterwards it lives in the user menu. */
export function TourInvitation() {
  const { hasCompleted, isOpen, start, skip, tour } = useTour();
  if (hasCompleted || isOpen) return null;

  return (
    <div className="anim-settle fixed bottom-4 right-4 z-[70] w-80 rounded-lg border border-accent-line bg-surface p-3.5 shadow-overlay">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-content">
        <Icon name="Sparkles" size="sm" className="text-accent" />
        First time here?
      </p>
      <p className="mt-1 text-2xs leading-relaxed text-content-secondary">
        {tour.description} {tour.steps.length} steps, about a minute.
      </p>
      <div className="mt-2.5 flex items-center justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={skip}>
          Not now
        </Button>
        <Button variant="primary" size="sm" onClick={start}>
          Start tour
        </Button>
      </div>
    </div>
  );
}

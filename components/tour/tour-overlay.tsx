"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { useTour } from "@/src/tour/tour-store";
import type { TourDefinition, TourStep } from "@/src/tour/tours";
import { useFocusTrap } from "@/src/a11y/use-focus-trap";
import { cn } from "@/src/lib/cn";

/**
 * The tour spotlight and its popover.
 *
 * Positioned from the anchor element's own bounding box rather than a
 * positioning library — one element, one rectangle, recalculated on scroll and
 * resize. Adding Floating UI for this would be a dependency for a dozen
 * callouts.
 *
 * Three things this has to get right, each of which it previously got wrong:
 *
 * 1. **A hidden anchor is not a found anchor.** Six steps point at navigation
 *    items, and the sidebar is `hidden lg:block` — so below 1024px the element
 *    is in the DOM with a zero-size rect. The old code took that at face value
 *    and drew a spotlight of size zero at the top-left corner, which reads as a
 *    full-screen scrim with a dot in it. Any laptop under 1024px broke on 40%
 *    of the steps.
 * 2. **An anchor on another route needs waiting for, not guessing at.** Three
 *    fixed retries at 120/320/640ms lost the race whenever the destination
 *    route was heavy. This polls on animation frames until a deadline.
 * 3. **The card is the content; the spotlight is the garnish.** When an anchor
 *    genuinely cannot be resolved, the step still has something to say — so it
 *    centres and says it, rather than pointing at nothing.
 *
 * Uses `.anim-fade` only. No sixth animation was added, and the
 * `prefers-reduced-motion` rule in `globals.css` already covers it.
 */

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;
const CARD_MARGIN = 12;
/** How long to wait for an anchor that a route change is still bringing in. */
const ANCHOR_TIMEOUT_MS = 1_800;

/**
 * Whether an element is genuinely on screen and measurable.
 *
 * `offsetParent === null` catches `display: none` on the element or any
 * ancestor, which is what `hidden lg:block` produces. The size check catches
 * the rest — a collapsed flex child, a zero-height container mid-transition.
 */
function isMeasurable(node: HTMLElement): boolean {
  if (node.offsetParent === null) return false;
  const box = node.getBoundingClientRect();
  return box.width > 1 && box.height > 1;
}

type AnchorState =
  | { status: "resolved"; rect: Rect }
  | { status: "waiting" }
  | { status: "unavailable" };

function useAnchorRect(anchor: string | undefined, stepId: string | undefined): AnchorState {
  const [state, setState] = React.useState<AnchorState>({ status: "waiting" });

  React.useEffect(() => {
    if (!anchor) {
      setState({ status: "unavailable" });
      return;
    }

    setState({ status: "waiting" });

    let frame = 0;
    let settled = false;
    const deadline = performance.now() + ANCHOR_TIMEOUT_MS;

    const measure = (): boolean => {
      const node = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      if (!node || !isMeasurable(node)) return false;

      const box = node.getBoundingClientRect();
      setState({
        status: "resolved",
        rect: { top: box.top, left: box.left, width: box.width, height: box.height },
      });
      return true;
    };

    // Poll on frames rather than fixed timeouts: a route change brings the
    // anchor in when it is ready, not on a schedule we can predict.
    const poll = () => {
      if (measure()) {
        settled = true;
        const node = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
        const box = node?.getBoundingClientRect();
        // Scroll once, on resolution — not on every re-measure, or a scrolling
        // user fights the tour for control of the viewport.
        if (box && (box.top < 96 || box.bottom > window.innerHeight - 96)) {
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
      if (performance.now() > deadline) {
        setState({ status: "unavailable" });
        return;
      }
      frame = window.requestAnimationFrame(poll);
    };

    frame = window.requestAnimationFrame(poll);

    // Once resolved, keep the rectangle honest as the page moves under it.
    const track = () => {
      if (!settled) return;
      if (!measure()) setState({ status: "unavailable" });
    };

    window.addEventListener("resize", track);
    window.addEventListener("scroll", track, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", track);
      window.removeEventListener("scroll", track, true);
    };
    // `stepId` is in the dependency list so returning to the same anchor on a
    // later step still re-runs the measurement.
  }, [anchor, stepId]);

  return state;
}

export function TourOverlay() {
  const { isOpen, step, index, tour, next, previous, skip } = useTour();
  const anchorState = useAnchorRect(step?.anchor, step?.id);
  const trapRef = useFocusTrap(isOpen);

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

  // The page behind the scrim must not scroll under a modal overlay — every
  // other overlay in the product locks it, and the tour was the exception.
  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const isLast = index === tour.steps.length - 1;
  const rect = anchorState.status === "resolved" ? anchorState.rect : null;
  const isWaiting = anchorState.status === "waiting";

  return (
    <TourCard
      key={step?.id ?? "none"}
      isOpen={isOpen}
      step={step}
      rect={rect}
      isWaiting={isWaiting}
      isLast={isLast}
      index={index}
      tour={tour}
      trapRef={trapRef}
      onNext={next}
      onPrevious={previous}
      onSkip={skip}
    />
  );
}

/**
 * The scrim, the spotlight and the card.
 *
 * Split out so the card can be measured before it is positioned. That
 * measurement is the whole point: the previous version placed the card at
 * `anchor.bottom + 12` with no bound, so a tall anchor pushed **Next** off the
 * bottom of the screen and the tour became unusable — no way forward, and the
 * only way out was Escape.
 *
 * Position is now resolved in a layout effect against the card's real height:
 * prefer below the anchor, flip above when there is no room, and clamp into the
 * viewport as a final guarantee. A step can always be advanced, whatever it
 * points at.
 */
function TourCard({
  isOpen,
  step,
  rect,
  isWaiting,
  isLast,
  index,
  tour,
  trapRef,
  onNext,
  onPrevious,
  onSkip,
}: {
  isOpen: boolean;
  step: TourStep | null;
  rect: Rect | null;
  isWaiting: boolean;
  isLast: boolean;
  index: number;
  tour: TourDefinition;
  trapRef: React.RefObject<HTMLElement | null>;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  React.useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !rect) {
      setPosition(null);
      return;
    }

    const height = card.offsetHeight;
    const width = card.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const below = rect.top + rect.height + CARD_MARGIN;
    const above = rect.top - CARD_MARGIN - height;

    let top: number;
    if (below + height <= viewportHeight - CARD_MARGIN) {
      top = below;
    } else if (above >= CARD_MARGIN) {
      top = above;
    } else {
      // Neither side fits — the anchor is taller than the space around it. Sit
      // the card inside the viewport and let it overlap; being reachable beats
      // being adjacent.
      top = Math.max(CARD_MARGIN, viewportHeight - height - CARD_MARGIN);
    }

    const left = Math.min(
      Math.max(CARD_MARGIN, rect.left),
      Math.max(CARD_MARGIN, viewportWidth - width - CARD_MARGIN),
    );

    setPosition({ top, left });
  }, [rect, step?.id, isWaiting]);

  if (!isOpen || !step) return null;

  const anchored = rect !== null;

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
        ref={(node) => {
          cardRef.current = node;
          (trapRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        className={cn(
          "fixed w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-surface p-3.5 shadow-overlay",
          // The body can scroll inside the card rather than pushing the footer
          // off the screen — a long step must never cost the Next button.
          "max-h-[calc(100vh-1.5rem)] overflow-y-auto",
          anchored
            ? // Hidden for the single frame between mount and measurement, so
              // the card is never seen at an unresolved position.
              position === null && "invisible"
            : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={anchored && position ? { top: position.top, left: position.left } : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-accent">
            {tour.name} · {index + 1} of {tour.steps.length}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip tour"
            className="shrink-0 text-content-tertiary transition-colors duration-150 hover:text-content"
          >
            <Icon name="X" size="xs" />
          </button>
        </div>

        <h2 className="mt-1.5 text-sm font-semibold text-content">{step.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-content-secondary">{step.body}</p>

        {step.tip ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-md border border-accent-line bg-accent-subtle px-2 py-1.5 text-2xs leading-relaxed text-accent-content">
            <Icon name="Sparkles" size="xs" className="mt-px shrink-0" />
            {step.tip}
          </p>
        ) : null}

        {/* Said plainly rather than hidden: the step still has its content, and
            a reader who cannot see the highlight should know why. */}
        {!anchored && !isWaiting && step.anchor ? (
          <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
            <Icon name="Info" size="xs" className="mt-px shrink-0" />
            {step.whenHidden ??
              "This control is not visible at the current window size — widen the window, or open the navigation menu, to see it highlighted."}
          </p>
        ) : null}

        {isWaiting ? (
          <p className="mt-2 flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="RefreshCw" size="xs" className="animate-spin" />
            Opening {step.route}…
          </p>
        ) : null}

        {/* Progress: a bar for scale, dots for position. Twelve dots read as a
            decoration; a bar with a count reads as progress. */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="h-1 flex-1 overflow-hidden rounded-full bg-surface-active"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-accent transition-all duration-200"
                style={{ width: `${((index + 1) / tour.steps.length) * 100}%` }}
              />
            </span>
            <span className="shrink-0 text-2xs tabular-nums text-content-tertiary">
              {index + 1}/{tour.steps.length}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
            {index > 0 ? (
              <Button variant="secondary" size="sm" onClick={onPrevious}>
                <Icon name="ChevronLeft" size="xs" />
                Back
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={onNext}>
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
    <div className="anim-settle fixed bottom-4 right-4 z-[70] w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-accent-line bg-surface p-3.5 shadow-overlay">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-content">
        <Icon name="Sparkles" size="sm" className="text-accent" />
        First time here?
      </p>
      <p className="mt-1 text-2xs leading-relaxed text-content-secondary">
        {tour.description} {tour.steps.length} steps, about{" "}
        {Math.max(1, Math.round(tour.steps.length * 0.25))} minutes.
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

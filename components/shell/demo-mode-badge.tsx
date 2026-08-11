"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APP } from "@/src/config/app-config";

/**
 * States what this environment is, on every screen.
 *
 * The login screen says the data is synthetic and the side nav footer carries
 * the build, but neither is in front of someone twenty minutes into a
 * walkthrough. A client who has stopped wondering whether the numbers are real
 * is the failure mode this prevents — and saying so plainly is worth more than
 * the alternative of hoping nobody asks.
 *
 * Rendered from `APP.environment`, so a build that is not the demo shows
 * nothing rather than a badge that has to be remembered about.
 */
export function DemoModeBadge() {
  if (APP.environment !== "Demo") return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="hidden items-center gap-1.5 rounded-sm border border-line bg-surface-subtle px-2 py-1 text-2xs font-medium text-content-secondary lg:flex"
          // Not a control, but it is worth reading aloud in the tab order's
          // place rather than being skipped as decoration.
          role="note"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-accent" />
          Demo Mode · Synthetic Data
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-[240px] text-2xs leading-relaxed">
          {APP.name} {APP.version}. Every case, plant and figure in this
          environment is seeded demonstration data — no production system is
          connected.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

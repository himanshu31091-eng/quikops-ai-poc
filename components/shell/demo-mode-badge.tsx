"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APP } from "@/src/config/app-config";

/**
 * States what this environment is, on every screen.
 *
 * Two claims are being guarded here, and the second is the serious one.
 *
 * The numbers are illustrative — the login screen says so and the nav footer
 * carries the build, but neither is in front of someone twenty minutes into a
 * walkthrough. A client who has stopped wondering whether the figures are real
 * is the first failure mode.
 *
 * The second: **Perma Construction Aids is a representative scenario, not a
 * QuikOps customer.** Nothing in this repository evidences an engagement with
 * them. A viewer who leaves the room believing the vendor has implemented this
 * for a named company has been misled about the one fact that cannot be walked
 * back afterwards, so the badge names the scenario rather than only the mode.
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
          Demo Scenario · Illustrative Data
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-[260px] text-2xs leading-relaxed">
          <span className="font-medium">
            Perma Construction Aids is a representative scenario, not a QuikOps
            customer.
          </span>{" "}
          It models an Indian construction-chemicals manufacturer so the platform
          can be shown against a real operational problem. Every case, plant,
          person and figure here is illustrative, and no production system is
          connected. {APP.name} {APP.version}.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

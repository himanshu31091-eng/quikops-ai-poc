"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { APP } from "@/src/config/app-config";
import { useTranslation } from "@/src/i18n/provider";

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
 * The second: **the modelled company is a representative scenario, not a
 * QuikOps customer.** Nothing in this repository evidences an engagement. A
 * viewer who leaves the room believing the vendor has implemented this for a
 * named company has been misled about the one fact that cannot be walked back
 * afterwards, so the badge names the scenario rather than only the mode.
 *
 * Both strings come from the tenant profile, passed down from the layout. They
 * used to be hardcoded to the demo tenant, which meant the evaluation
 * environment displayed the *other* tenant's name — the precise failure the
 * paragraph above exists to prevent. The badge is a client component and cannot
 * read `QUIKOPS_TENANT` itself; that variable is server-only.
 */
interface DemoModeBadgeProps {
  /** e.g. "Sika Evaluation Environment" — resolved on the server. */
  environmentLabel: string;
  /** What the data actually is, in the tenant's own words. */
  dataDisclosure: string;
}

export function DemoModeBadge({ environmentLabel, dataDisclosure }: DemoModeBadgeProps) {
  const { t } = useTranslation();
  if (APP.environment !== "Demo") return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex max-w-52 shrink items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-sm border border-line bg-surface-subtle px-1.5 py-1 text-2xs font-medium text-content-secondary sm:px-2 2xl:max-w-96"
          // Not a control, but it is worth reading aloud in the tab order's
          // place rather than being skipped as decoration.
          role="note"
          // The visible text is progressively abbreviated, so the whole claim
          // stays available to a screen reader at every width.
          aria-label={`${environmentLabel} · ${dataDisclosure}`}
          title={`${environmentLabel} · ${dataDisclosure}`}
        >
          <span className="size-1.5 shrink-0 rounded-full bg-accent" />
          {/*
            Three tiers, because this string is long in English and longer in
            Spanish and Portuguese. Rendering it in full at every width is what
            wrapped the badge into a five-line block that burst out of a
            fixed-height header and overlapped the page beneath it.

            The dot alone still says "this is not production" at a glance, and
            the full sentence is one hover or one screen reader away at every
            width.
          */}
          <span className="hidden truncate 2xl:inline">
            {environmentLabel} · {dataDisclosure}
          </span>
          <span className="hidden truncate xl:inline 2xl:hidden">{environmentLabel}</span>
          <span className="hidden truncate sm:inline xl:hidden">{t("shell.environmentShort")}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-65 text-2xs leading-relaxed">
          <span className="font-medium">{environmentLabel}</span> — {dataDisclosure}.
        </p>
        <p className="mt-1.5 max-w-65 text-2xs leading-relaxed">
          <span className="font-medium">{t("shell.scenarioNotCustomer")}</span>{" "}
          {t("shell.scenarioDetail")} {APP.name} {APP.version}.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

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
          className="hidden items-center gap-1.5 rounded-sm border border-line bg-surface-subtle px-2 py-1 text-2xs font-medium text-content-secondary lg:flex"
          // Not a control, but it is worth reading aloud in the tab order's
          // place rather than being skipped as decoration.
          role="note"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-accent" />
          {environmentLabel} · {dataDisclosure}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-[260px] text-2xs leading-relaxed">
          <span className="font-medium">{t("shell.scenarioNotCustomer")}</span>{" "}
          {t("shell.scenarioDetail")} {APP.name} {APP.version}.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

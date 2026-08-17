"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Icon } from "./icon";
import {
  ANNOUNCEMENT_TIPS,
  FIRST_USE_TIPS,
  TERM_TIPS,
  type Tip,
} from "@/src/help/tips";
import { useTipDismissal } from "@/src/help/use-tips";
import { cn } from "@/src/lib/cn";

/**
 * The three in-app tip surfaces.
 *
 * One file because they share the content source and the dismissal hook, and
 * splitting them would put three imports where a screen needs one. They do not
 * share a shell: a definition, a welcome and a release note are read in
 * different moments and should not look alike.
 *
 * **`TermHint`** is the one that earns its place. Every other kind of help asks
 * the reader to leave what they are doing; this one answers the question where
 * it was asked, in a popover rather than a tooltip because the content is a
 * paragraph and tooltips are unreachable by touch.
 */

/* ------------------------------------------------------------ Term hint --- */

export function TermHint({
  term,
  className,
}: {
  /** A key of `TERM_TIPS` — `priority`, `health`, `revenueAtRisk`, … */
  term: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const tip = TERM_TIPS[term];
  if (!tip) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What does ${tip.title} mean?`}
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-content-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-content-secondary",
            className,
          )}
        >
          <Icon name="CircleHelp" size="xs" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className="text-xs font-semibold text-content">{tip.title}</p>
        <p className="mt-1 text-2xs leading-relaxed text-content-secondary">{tip.body}</p>
        {tip.learnMoreHref ? (
          <Link
            href={tip.learnMoreHref}
            className="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
          >
            {t("ui.readMore")}
            <Icon name="ArrowRight" size="xs" />
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------- Dismissible ----- */

function DismissibleTip({
  tip,
  tone,
  icon,
  eyebrow,
}: {
  tip: Tip;
  tone: "accent" | "success";
  icon: string;
  eyebrow: string;
}) {
  const { t } = useTranslation();
  const { isReady, isDismissed, dismiss } = useTipDismissal(tip.id);
  if (!isReady || isDismissed) return null;

  return (
    <aside
      aria-label={eyebrow}
      className={cn(
        "anim-settle flex items-start gap-3 rounded-lg border px-3.5 py-3 print:hidden",
        tone === "accent"
          ? "border-accent-line bg-accent-subtle"
          : "border-success-line bg-success-subtle",
      )}
    >
      <span
        className={cn(
          "mt-px flex size-6 shrink-0 items-center justify-center rounded-md",
          tone === "accent"
            ? "bg-accent text-white"
            : "bg-success text-white",
        )}
        aria-hidden
      >
        <Icon name={icon} size="sm" />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-2xs font-semibold uppercase tracking-wide",
            tone === "accent" ? "text-accent-content" : "text-success-content",
          )}
        >
          {eyebrow}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-content">{tip.title}</p>
        <p className="mt-0.5 text-2xs leading-relaxed text-content-secondary">{tip.body}</p>
        {tip.learnMoreHref ? (
          <Button variant="ghost" size="xs" asChild className="mt-1.5 -ml-2">
            <Link href={tip.learnMoreHref}>
              {t("ui.showMe")}
              <Icon name="ArrowRight" size="xs" />
            </Link>
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label={`Dismiss: ${tip.title}`}
        className="shrink-0 rounded-md p-0.5 text-content-tertiary transition-colors duration-150 hover:bg-surface-hover hover:text-content"
      >
        <Icon name="X" size="xs" />
      </button>
    </aside>
  );
}

/**
 * One callout per screen, on first arrival, saying what the screen is for.
 *
 * Renders nothing once dismissed and nothing at all for a screen with no tip,
 * so a module opts in by having an entry in `FIRST_USE_TIPS` rather than by
 * wiring anything.
 */
export function FirstUseTip({ screen }: { screen: string }) {
  const tip = FIRST_USE_TIPS[screen];
  if (!tip) return null;
  return <DismissibleTip tip={tip} tone="accent" icon="Sparkles" eyebrow="First visit" />;
}

/**
 * What changed in this release, for someone returning.
 *
 * Shown once per announcement id, which is versioned — so the product speaks
 * again when there is genuinely something new and stays quiet otherwise.
 */
export function ReleaseAnnouncement() {
  const tip = ANNOUNCEMENT_TIPS[0];
  if (!tip) return null;
  return <DismissibleTip tip={tip} tone="success" icon="Zap" eyebrow="New in this release" />;
}

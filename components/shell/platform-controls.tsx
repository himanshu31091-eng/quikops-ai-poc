"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LOCALES, LOCALE_META, type Locale } from "@/src/i18n/config";
import { useTranslation } from "@/src/i18n/provider";
import { useDemoReset } from "@/src/demo/use-demo-reset";
import { useTour } from "@/src/tour/tour-store";
import { cn } from "@/src/lib/cn";

/**
 * The cross-platform controls that belong on every screen: language, help,
 * restart tour and reset demo.
 *
 * Grouped into one component so the app shell gains a single element rather
 * than four, and so these can be reordered without touching the shell again.
 */

function LanguageMenu() {
  const { t } = useTranslation();
  const { locale, setLocale } = useTranslation();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("shell.changeLanguage")}>
              <Icon name="Globe" size="sm" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-2xs">Language — {LOCALE_META[locale].nativeLabel}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("shell.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((entry: Locale) => (
          <DropdownMenuItem
            key={entry}
            onSelect={() => setLocale(entry)}
            className={cn(entry === locale && "font-semibold text-content")}
          >
            <span className="flex-1">{LOCALE_META[entry].nativeLabel}</span>
            <span className="text-2xs text-content-tertiary">{LOCALE_META[entry].label}</span>
            {entry === locale ? <Icon name="Check" size="xs" className="ml-1.5 text-accent" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-2xs leading-relaxed text-content-tertiary">
          The interface is translated. Operational case content stays in the language
          it was recorded in.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DemoResetControl() {
  const { t } = useTranslation();
  const { reset, isDirty } = useDemoReset();
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 4_000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  if (confirming) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          reset();
          setConfirming(false);
        }}
      >
        <Icon name="RefreshCw" size="sm" />
        {t("shell.confirmReset")}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("shell.resetDemoData")}
          onClick={() => setConfirming(true)}
        >
          <Icon
            name="RefreshCw"
            size="sm"
            className={cn(isDirty && "text-accent")}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-2xs">
          {isDirty
            ? "Reset demo — discards this session's changes"
            : "Reset demo — nothing has changed yet"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function TourControl() {
  const { t } = useTranslation();
  const { start, hasCompleted } = useTour();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("shell.startTour")} onClick={start}>
          <Icon name="Sparkles" size="sm" className={cn(!hasCompleted && "text-accent")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-2xs">{hasCompleted ? "Restart product tour" : "Take the product tour"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function PlatformControls() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-0.5">
      <TourControl />
      <LanguageMenu />
      <DemoResetControl />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("shell.openHelp")} asChild>
            <Link href="/help">
              <Icon name="CircleHelp" size="sm" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-2xs">{t("shell.helpCenter")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

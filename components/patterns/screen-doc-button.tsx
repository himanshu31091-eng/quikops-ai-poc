"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SCREEN_DOCS } from "@/src/help/content";
import { useFocusTrap } from "@/src/a11y/use-focus-trap";

/**
 * "What does this screen do?" — the interactive documentation panel.
 *
 * Rendered from `PageHeader`, so adding it to a module is a single prop rather
 * than a component per screen. The content lives in `src/help/content.ts`
 * alongside the Help Center articles, which is what lets the documentation
 * search index screen purpose and KPI definitions without a second source.
 */

export function ScreenDocButton({ moduleKey }: { moduleKey: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const doc = SCREEN_DOCS[moduleKey];
  const trapRef = useFocusTrap(open);

  if (!doc) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`What does the ${doc.title} screen do?`}
        onClick={() => setOpen(true)}
      >
        <Icon name="Info" size="sm" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <div ref={trapRef as React.RefObject<HTMLDivElement>}>
            <DialogTitle>{t("ui.whatDoesThisScreenDo")}</DialogTitle>
            <DialogDescription>{doc.title}</DialogDescription>

            <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {t("ui.purpose")}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                  {doc.purpose}
                </p>
              </section>

              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {t("ui.businessValue")}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                  {doc.businessValue}
                </p>
              </section>

              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  KPIs explained
                </h3>
                <dl className="mt-1 space-y-1.5">
                  {doc.kpisExplained.map((kpi) => (
                    <div key={kpi.label}>
                      <dt className="text-xs font-medium text-content">{kpi.label}</dt>
                      <dd className="text-2xs leading-relaxed text-content-secondary">
                        {kpi.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {t("ui.workflow")}
                </h3>
                <ol className="mt-1 space-y-1">
                  {doc.workflow.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-line text-2xs text-content-tertiary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-content-secondary">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {t("ui.bestPractices")}
                </h3>
                <ul className="mt-1 space-y-1">
                  {doc.bestPractices.map((practice) => (
                    <li key={practice} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-content-tertiary" />
                      <span className="min-w-0 flex-1 text-xs leading-relaxed text-content-secondary">
                        {practice}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {t("ui.relatedScreens")}
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {doc.relatedScreens.map((related) => (
                    <Link
                      key={related.href}
                      href={related.href}
                      onClick={() => setOpen(false)}
                      className="rounded-sm border border-line bg-surface px-2 py-1 text-2xs text-content-secondary transition-colors duration-150 hover:border-accent-line hover:text-accent-content"
                    >
                      {related.label}
                    </Link>
                  ))}
                  <Link
                    href="/help"
                    onClick={() => setOpen(false)}
                    className="rounded-sm border border-accent-line bg-accent-subtle px-2 py-1 text-2xs text-accent-content"
                  >
                    {t("shell.helpCenter")}
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

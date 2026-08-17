"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import dynamic from "next/dynamic";
import type { CopilotSubject } from "@/components/copilot/types";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PORTFOLIO_PROMPTS } from "@/src/ai/prompts/catalogue";
import type { User } from "@/src/domain/types";
import { formatMoney, formatNumber } from "@/src/lib/format";

/**
 * The Executive Dashboard's Copilot.
 *
 * Same panel, same transport, same error handling as the case page — only the
 * scope differs, so the server sends the operational position instead of one
 * case record. Nothing about the panel is duplicated here; this file owns the
 * open state and the way the portfolio introduces itself, and nothing else.
 *
 * The provider sits on the page rather than beside the button because two
 * separate controls open it: the header action and the AI summary's Regenerate.
 */

const CopilotPanel = dynamic(
  () => import("@/components/copilot/copilot-panel").then((module) => module.CopilotPanel),
  {
    ssr: false,
    loading: () => (
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-3 border-l border-line bg-surface p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </aside>
    ),
  },
);

interface DashboardCopilotStore {
  /** Opens the panel. Pass a question to have it asked immediately. */
  open: (question?: string) => void;
}

const DashboardCopilotContext = React.createContext<DashboardCopilotStore | null>(null);

/** No-op when no provider is mounted, so a control can render in isolation. */
const FALLBACK: DashboardCopilotStore = { open: () => undefined };

export function useDashboardCopilot(): DashboardCopilotStore {
  return React.useContext(DashboardCopilotContext) ?? FALLBACK;
}

export interface PortfolioBrief {
  plantCount: number;
  openCases: number;
  revenueAtRisk: number;
  currency: string;
  criticalOpen: number;
  breachedOpen: number;
}

export function DashboardCopilotProvider({
  sessionUser,
  brief,
  children,
}: {
  sessionUser: User;
  brief: PortfolioBrief;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [autoAsk, setAutoAsk] = React.useState<string | null>(null);

  const open = React.useCallback((question?: string) => {
    setMounted(true);
    if (question) setAutoAsk(question);
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => setIsOpen(false), []);

  const store = React.useMemo<DashboardCopilotStore>(() => ({ open }), [open]);

  const subject = React.useMemo<CopilotSubject>(
    () => ({
      scope: "portfolio",
      ref: `${brief.plantCount} plants · ${formatNumber(brief.openCases)} open cases`,
      scopeNote: "Answers from the operational position",
      offlineSource: "the operational position",
      inputLabel: "Ask the Copilot about the operation",
      placeholder:
        "Ask which plant is worst, where the revenue risk sits, or what to focus on today.",
      suggestions: PORTFOLIO_PROMPTS,
      intro: (
        <>
          I have the current operational position across{" "}
          <span className="font-medium text-content">{brief.plantCount} plants</span> —{" "}
          {formatNumber(brief.openCases)} open cases carrying{" "}
          <span className="font-medium text-content">
            {formatMoney(brief.revenueAtRisk, brief.currency)}
          </span>{" "}
          of revenue at risk, {brief.criticalOpen} critical and {brief.breachedOpen} past SLA,
          plus plant health, execution performance, supplier exposure and inventory. Ask about
          any of it.
        </>
      ),
    }),
    [brief],
  );

  return (
    <DashboardCopilotContext.Provider value={store}>
      {children}
      {mounted ? (
        <CopilotPanel
          subject={subject}
          sessionUser={sessionUser}
          open={isOpen}
          onClose={close}
          autoAsk={autoAsk}
        />
      ) : null}
    </DashboardCopilotContext.Provider>
  );
}

/** The Dashboard header action. */
export function AskCopilotButton() {
  const { t } = useTranslation();
  const { open } = useDashboardCopilot();
  return (
    <Button variant="primary" size="md" onClick={() => open()} data-tour="dashboard-copilot">
      <Icon name="Sparkles" size="sm" />
      {t("cd.askCopilot")}
    </Button>
  );
}

/**
 * The AI summary's Regenerate control. Produces a fresh board-level briefing
 * from the live model rather than re-rendering the stored one — which is what
 * the label has always implied.
 */
export function RegenerateSummaryButton() {
  const { t } = useTranslation();
  const { open } = useDashboardCopilot();
  const prompt =
    PORTFOLIO_PROMPTS.find((entry) => entry.id === "board-brief")?.prompt ??
    "Write me a board-level briefing on operational performance.";

  return (
    <Button variant="secondary" size="sm" onClick={() => open(prompt)}>
      <Icon name="RefreshCw" size="sm" />
      {t("dashboard.regenerate")}
    </Button>
  );
}

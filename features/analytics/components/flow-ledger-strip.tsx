"use client";

import { Icon } from "@/components/patterns/icon";
import { useTranslation } from "@/src/i18n/provider";
import type { FlowLedger, FlowUnit } from "@/src/domain/flow-balance";
import { formatMoney, formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * The balance, read as a sentence rather than a table.
 *
 * `opening + detected − resolved = closing` is an identity that holds exactly
 * (see `buildFlowLedger`), so it is rendered as four connected terms with the
 * operators between them — the shape of the arithmetic, not a grid of numbers
 * a reader has to do the arithmetic on.
 *
 * The two middle terms carry direction in their own right: detection is
 * pressure arriving, resolution is pressure leaving, and they are toned
 * accordingly so the balance can be read at a glance before any figure is.
 */

interface TermProps {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "critical" | "success" | "accent";
  emphasis?: boolean;
}

const TONE_VALUE: Record<TermProps["tone"], string> = {
  neutral: "text-content",
  critical: "text-critical-content",
  success: "text-success-content",
  accent: "text-accent-content",
};

const TONE_RAIL: Record<TermProps["tone"], string> = {
  neutral: "bg-line-strong",
  critical: "bg-critical",
  success: "bg-success",
  accent: "bg-accent",
};

function Term({ label, value, hint, tone, emphasis = false }: TermProps) {
  return (
    <div className="flex min-w-0 flex-1 gap-2.5">
      <span className={cn("mt-0.5 w-0.5 shrink-0 rounded-full", TONE_RAIL[tone])} aria-hidden />
      <span className="min-w-0">
        <span className="block text-2xs font-medium uppercase tracking-wide text-content-tertiary">
          {label}
        </span>
        <span
          className={cn(
            "block tabular-nums",
            emphasis ? "text-xl font-semibold" : "text-lg font-semibold",
            TONE_VALUE[tone],
          )}
        >
          {value}
        </span>
        <span className="block truncate text-2xs text-content-tertiary">{hint}</span>
      </span>
    </div>
  );
}

function Operator({ symbol }: { symbol: "plus" | "minus" | "equals" }) {
  const glyph = symbol === "plus" ? "+" : symbol === "minus" ? "−" : "=";
  return (
    <span
      aria-hidden
      className="hidden shrink-0 select-none self-center text-base font-medium text-content-tertiary sm:block"
    >
      {glyph}
    </span>
  );
}

export function FlowLedgerStrip({
  ledger,
  unit,
  currency,
}: {
  ledger: FlowLedger;
  unit: FlowUnit;
  currency: string;
}) {
  const { t } = useTranslation();
  const isValue = unit === "value";
  const show = (count: number, value: number): string =>
    isValue ? formatMoney(value, currency, { forceCompact: true }) : formatNumber(count);

  const net = isValue ? ledger.netValue : ledger.net;
  const netPct = isValue ? ledger.netValuePct : ledger.netPct;
  const cleared = net < 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
        <Term
          label={t("analytics.openAtStart")}
          value={show(ledger.opening, ledger.openingValue)}
          hint={`${ledger.horizon.days} days ago`}
          tone="neutral"
        />
        <Operator symbol="plus" />
        <Term
          label={t("col.detected")}
          value={show(ledger.detected, ledger.detectedValue)}
          hint={t("analytics.arrivedInTheWindow")}
          tone="critical"
        />
        <Operator symbol="minus" />
        <Term
          label={t("analytics.resolved")}
          value={show(ledger.resolved, ledger.resolvedValue)}
          hint={t("analytics.verifiedOrClosed")}
          tone="success"
        />
        <Operator symbol="equals" />
        <Term
          label={t("analytics.openNow")}
          value={show(ledger.closing, ledger.closingValue)}
          hint={`${cleared ? "down" : "up"} ${Math.abs(Math.round(netPct))}% on the window`}
          tone="accent"
          emphasis
        />
      </div>

      <p
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed",
          cleared
            ? "border-success-line bg-success-subtle text-success-content"
            : net === 0
              ? "border-line bg-surface-hover text-content-secondary"
              : "border-critical-line bg-critical-subtle text-critical-content",
        )}
      >
        <Icon
          name={cleared ? "TrendingDown" : net === 0 ? "Minus" : "TrendingUp"}
          size="sm"
          className="mt-px shrink-0"
        />
        <span>
          {cleared
            ? `The portfolio absorbed everything that arrived and ${show(Math.abs(ledger.net), Math.abs(ledger.netValue))} more besides.`
            : net === 0
              ? "Everything that arrived was cleared. The balance is unchanged."
              : `${show(Math.abs(ledger.net), Math.abs(ledger.netValue))} more arrived than left. The gap is what the backlog grew by.`}
        </span>
      </p>

      {ledger.precedesCorpus ? (
        <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
          <Icon name="Info" size="xs" className="mt-px shrink-0" />
          <span>
            This window opens before the earliest case on record, so the opening
            balance is zero because there was nothing yet — not because the
            portfolio was clear. Narrow the horizon for a balance that means
            something.
          </span>
        </p>
      ) : null}
    </div>
  );
}

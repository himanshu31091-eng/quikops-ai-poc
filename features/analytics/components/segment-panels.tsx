"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { TermHint } from "@/components/patterns/in-app-tip";
import type {
  AgeBand,
  CustomerConcentration,
  EscalationAnalytics,
} from "@/src/domain/segment-performance";
import { caseHref } from "@/src/lib/routes";
import { formatHours, formatMoney, formatPercent } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * Commercial and escalation views of the same corpus.
 *
 * Neither is a table of every row. A customer list of 314 accounts and an
 * escalation list of every raised case are both true and both useless — the
 * finding in each case is a shape, so each panel leads with the shape and
 * discloses the rows behind it.
 */

/* -------------------------------------------------------- Customer -------- */

const TIER_TONE: Record<string, string> = {
  TIER_1: "bg-critical-subtle text-critical-content border-critical-line",
  TIER_2: "bg-high-subtle text-high-content border-high-line",
  TIER_3: "bg-surface-hover text-content-secondary border-line",
};

const TIER_LABEL: Record<string, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

export function CustomerExposurePanel({
  data,
  currency,
}: {
  data: CustomerConcentration;
  currency: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? data.customers : data.customers.slice(0, 5);
  const maxExposure = data.customers[0]?.openExposure ?? 0;

  if (data.customers.length === 0) {
    return (
      <EmptyState
        icon="Users"
        size="sm"
        title="No customer-linked cases"
        description="Nothing in the current corpus names a customer. Inventory and capacity conditions often do not."
      />
    );
  }

  const concentrated = data.topThreeSharePct >= 60;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-md border px-3 py-2.5",
          concentrated
            ? "border-critical-line bg-critical-subtle"
            : "border-line bg-surface-hover",
        )}
      >
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold",
            concentrated ? "text-critical-content" : "text-content",
          )}
        >
          <Icon name={concentrated ? "TriangleAlert" : "Users"} size="sm" />
          {concentrated
            ? "Exposure is concentrated"
            : "Exposure is spread across the book"}
        </p>
        <p className="mt-1 text-2xs leading-relaxed text-content-secondary">
          The top three accounts carry{" "}
          <span className="font-semibold text-content">
            {formatPercent(data.topThreeSharePct, 0)}
          </span>{" "}
          of open exposure, and it takes{" "}
          <span className="font-semibold text-content">
            {data.accountsToHalfExposure}
          </span>{" "}
          account{data.accountsToHalfExposure === 1 ? "" : "s"} to reach half of it.
          {concentrated
            ? " A single commercial conversation moves more here than a queue-wide push."
            : " No single account dominates, so relief has to come from throughput rather than from one negotiation."}
        </p>
      </div>

      <ul className="space-y-1.5">
        {visible.map((customer) => (
          <li key={customer.code}>
            <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-hover">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-content">
                    {customer.name}
                  </span>
                  {customer.tier ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-sm border px-1 py-px text-2xs font-medium",
                        TIER_TONE[customer.tier] ?? TIER_TONE.TIER_3,
                      )}
                    >
                      {TIER_LABEL[customer.tier] ?? customer.tier}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-surface-active">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{
                      width:
                        maxExposure === 0
                          ? "0%"
                          : `${(customer.openExposure / maxExposure) * 100}%`,
                    }}
                    aria-hidden
                  />
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-2xs text-content-tertiary">
                  <span>
                    {customer.openCases} open of {customer.totalCases}
                  </span>
                  {customer.breachedOpen > 0 ? (
                    <span className="text-critical-content">
                      {customer.breachedOpen} past target
                    </span>
                  ) : null}
                  {customer.recurringCases > 0 ? (
                    <span className="text-high-content">
                      {customer.recurringCases} recurring
                    </span>
                  ) : null}
                  {customer.meanResolutionHours !== null ? (
                    <span>{formatHours(customer.meanResolutionHours)} to resolve</span>
                  ) : null}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-content">
                  {formatMoney(customer.openExposure, currency, { forceCompact: true })}
                </span>
                <span className="block text-2xs tabular-nums text-content-tertiary">
                  {formatPercent(customer.exposureSharePct, 0)} of open
                </span>
              </span>

              {customer.topCaseNo ? (
                <Link
                  href={caseHref(customer.topCaseNo)}
                  aria-label={`Open the worst case for ${customer.name}`}
                  className="shrink-0 rounded-md p-1 text-content-tertiary transition-colors duration-150 hover:bg-surface-active hover:text-content"
                >
                  <Icon name="ArrowUpRight" size="xs" />
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {data.customers.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
        >
          {expanded
            ? "Show the top five only"
            : `Show all ${data.customers.length} accounts`}
          <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size="xs" />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------ Escalation -------- */

export function EscalationPanel({
  data,
  currency,
}: {
  data: EscalationAnalytics;
  currency: string;
}) {
  if (data.totalEscalatedOpen === 0) {
    return (
      <EmptyState
        icon="ShieldCheck"
        size="sm"
        title="Nothing above its owner"
        description="No open case has been escalated. Work is being resolved at the level it was assigned to."
      />
    );
  }

  const maxExposure = Math.max(...data.bands.map((band) => band.exposure), 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          {
            label: "Escalated",
            value: String(data.totalEscalatedOpen),
            hint: `${formatPercent(data.escalationRatePct, 0)} of open work`,
          },
          {
            label: "Exposure above owner",
            value: formatMoney(data.totalEscalatedExposure, currency, {
              forceCompact: true,
            }),
            hint: "needs a decision, not effort",
          },
          {
            label: "Mean time escalated",
            value: data.meanDays === null ? "—" : `${data.meanDays}d`,
            hint: "since breach or detection",
          },
        ].map((entry) => (
          <div
            key={entry.label}
            className="rounded-md border border-line bg-surface px-2.5 py-2"
          >
            <p className="text-2xs text-content-tertiary">{entry.label}</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-content">
              {entry.value}
            </p>
            <p className="text-2xs text-content-tertiary">{entry.hint}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {data.bands.map((band) => (
          <li key={band.level} className="flex items-center gap-3">
            <span className="w-28 shrink-0 sm:w-44">
              <span className="block text-2xs font-medium text-content">{band.label}</span>
              <span className="block text-2xs text-content-tertiary">
                {band.openCases} open
                {band.breachedOpen > 0 ? ` · ${band.breachedOpen} past target` : ""}
              </span>
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-active">
              <span
                className={cn(
                  "block h-full rounded-full",
                  band.level >= 3 ? "bg-critical" : band.level === 2 ? "bg-high" : "bg-medium",
                )}
                style={{ width: `${(band.exposure / maxExposure) * 100}%` }}
                aria-hidden
              />
            </span>
            <span className="w-16 shrink-0 text-right text-2xs font-semibold tabular-nums text-content">
              {formatMoney(band.exposure, currency, { forceCompact: true })}
            </span>
            <span className="w-12 shrink-0 text-right text-2xs tabular-nums text-content-tertiary">
              {band.meanDays === null ? "—" : `${band.meanDays}d`}
            </span>
          </li>
        ))}
      </ul>

      {data.oldest ? (
        <p className="flex items-start gap-1.5 rounded-md border border-high-line bg-high-subtle px-2.5 py-2 text-2xs leading-relaxed text-high-content">
          <Icon name="Clock" size="xs" className="mt-px shrink-0" />
          <span>
            The longest-running escalation is{" "}
            <Link
              href={caseHref(data.oldest.caseNo)}
              className="font-semibold underline underline-offset-2"
            >
              {data.oldest.caseNo}
            </Link>{" "}
            at {data.oldest.days} days, holding{" "}
            {formatMoney(data.oldest.exposure, currency, { forceCompact: true })}.
            {data.unownedEscalated > 0
              ? ` ${data.unownedEscalated} escalated case${data.unownedEscalated === 1 ? " has" : "s have"} no owner at all.`
              : ""}
          </span>
        </p>
      ) : null}

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-tertiary">
        <Icon name="Info" size="xs" className="mt-px shrink-0" />
        <span>
          Time escalated is measured from the SLA breach where there is one and from
          detection otherwise, because breaching is what escalates a case. It is a
          floor: a case raised by hand before it breached has been escalated for
          longer than this shows.
        </span>
      </p>
    </div>
  );
}

/* ----------------------------------------------------------- Ageing ------- */

export function AgeProfilePanel({
  bands,
  currency,
}: {
  bands: AgeBand[];
  currency: string;
}) {
  const total = bands.reduce((sum, band) => sum + band.openCases, 0);
  const stale = bands[bands.length - 1];

  if (total === 0) {
    return (
      <EmptyState
        icon="CircleCheck"
        size="sm"
        title="Nothing open"
        description="There is no open work to age."
      />
    );
  }

  return (
    <div className="space-y-3">
      <span className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden>
        {bands.map((band, index) => (
          <span
            key={band.key}
            className={cn(
              index === 0
                ? "bg-success"
                : index === 1
                  ? "bg-medium"
                  : index === 2
                    ? "bg-high"
                    : "bg-critical",
            )}
            style={{ width: `${(band.openCases / total) * 100}%` }}
          />
        ))}
      </span>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {bands.map((band, index) => (
          <div key={band.key}>
            <dt className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  index === 0
                    ? "bg-success"
                    : index === 1
                      ? "bg-medium"
                      : index === 2
                        ? "bg-high"
                        : "bg-critical",
                )}
                aria-hidden
              />
              {band.label}
            </dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-content">
              {band.openCases}
            </dd>
            <dd className="text-2xs tabular-nums text-content-tertiary">
              {formatMoney(band.exposure, currency, { forceCompact: true })}
            </dd>
          </div>
        ))}
      </dl>

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-content-secondary">
        <Icon name="Info" size="xs" className="mt-px shrink-0 text-content-tertiary" />
        <span>
          Age is not the same as breach
          <TermHint term="sla" />. A low-band case can sit for three weeks inside its
          720-hour target, while a critical one is late in a day.
          {stale && stale.openCases > 0
            ? ` ${stale.openCases} case${stale.openCases === 1 ? " has" : "s have"} been open over two weeks.`
            : ""}
        </span>
      </p>
    </div>
  );
}

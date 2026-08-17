"use client";

import * as React from "react";
import type { Translate } from "@/src/domain/labels";
import { useTranslation } from "@/src/i18n/provider";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/empty-state";
import { PRIORITY_META } from "@/src/config/app-config";
import type {
  BandFlow,
  FlowDimension,
  FlowSlice,
  FlowUnit,
} from "@/src/domain/flow-balance";
import { formatMoney, formatNumber } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";

/**
 * Where the net came from, and what it looks like inside one slice.
 *
 * Rows rather than a table: each one is a single horizontal axis with detection
 * running right of centre and resolution left of it, so a slice that is falling
 * behind is visible before any number is read. A grid of detected/resolved/net
 * columns would carry the same figures and none of the shape.
 *
 * Selecting a row discloses its detail in place. Progressive disclosure rather
 * than a modal: the comparison against the other slices is the context that
 * makes one slice mean anything, and a dialog would cover it up.
 */

function SliceRow({
  slice,
  maxMagnitude,
  unit,
  currency,
  selected,
  onSelect,
}: {
  slice: FlowSlice;
  maxMagnitude: number;
  unit: FlowUnit;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const isValue = unit === "value";
  const detected = isValue ? slice.detectedValue : slice.detected;
  const resolved = isValue ? slice.resolvedValue : slice.resolved;
  const net = isValue ? slice.netValue : slice.net;

  const show = (value: number): string =>
    isValue
      ? formatMoney(Math.abs(value), currency, { forceCompact: true })
      : formatNumber(Math.abs(value));

  const share = (value: number): string =>
    maxMagnitude === 0 ? "0%" : `${Math.min(100, (Math.abs(value) / maxMagnitude) * 100)}%`;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors duration-150",
          selected ? "bg-surface-active" : "hover:bg-surface-hover",
        )}
      >
        <span className="w-24 shrink-0 truncate text-xs font-medium text-content sm:w-40">
          {slice.label}
        </span>

        {/* Resolution grows leftwards, detection rightwards, from a shared centre. */}
        <span className="flex min-w-0 flex-1 items-center gap-px">
          <span className="flex flex-1 justify-end">
            <span
              className="h-3.5 rounded-l-sm bg-success"
              style={{ width: share(resolved) }}
              aria-hidden
            />
          </span>
          <span className="h-4 w-px shrink-0 bg-line-strong" aria-hidden />
          <span className="flex flex-1">
            <span
              className="h-3.5 rounded-r-sm bg-critical"
              style={{ width: share(detected) }}
              aria-hidden
            />
          </span>
        </span>

        <span
          className={cn(
            "w-16 shrink-0 text-right text-xs font-semibold tabular-nums",
            net > 0
              ? "text-critical-content"
              : net < 0
                ? "text-success-content"
                : "text-content-tertiary",
          )}
        >
          {net > 0 ? "+" : net < 0 ? "−" : ""}
          {show(net)}
        </span>

        <Icon
          name={selected ? "ChevronUp" : "ChevronDown"}
          size="xs"
          className="shrink-0 text-content-tertiary"
        />
      </button>

      {selected ? (
        <div className="anim-fade mx-2.5 mb-2 rounded-md border border-line bg-surface-subtle px-3 py-2.5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {[
              { label: t("col.detected"), value: show(detected), tone: "text-critical-content" },
              { label: t("analytics.resolved"), value: show(resolved), tone: "text-success-content" },
              { label: t("analytics.openNow"), value: formatNumber(slice.open), tone: "text-content" },
              {
                label: t("analytics.openExposure"),
                value: formatMoney(slice.openValue, currency, { forceCompact: true }),
                tone: "text-content",
              },
            ].map((entry) => (
              <div key={entry.label}>
                <dt className="text-2xs text-content-tertiary">{entry.label}</dt>
                <dd className={cn("text-sm font-semibold tabular-nums", entry.tone)}>
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-2xs leading-relaxed text-content-secondary">
            {slice.net > 0
              ? `This slice added ${slice.net} case${slice.net === 1 ? "" : "s"} more than it cleared, so it is contributing to the growth rather than absorbing it.`
              : slice.net < 0
                ? `This slice cleared ${Math.abs(slice.net)} more than arrived — it is absorbing pressure from elsewhere in the portfolio.`
                : "Detection and resolution matched exactly here over the window."}
          </p>
        </div>
      ) : null}
    </li>
  );
}

const buildDimensions = (t: Translate) => [
  { key: "plant", label: "Plant", icon: "Factory" },
  { key: "exception", label: t("administration.exceptionType"), icon: "Layers" },
  { key: "band", label: t("col.priority"), icon: "Target" },
  { key: "owner", label: t("col.owner"), icon: "UserCog" },
] as const;

export function FlowDrilldown({
  slices,
  dimension,
  unit,
  currency,
  selectedKey,
  onDimensionChange,
  onSelect,
}: {
  slices: FlowSlice[];
  dimension: FlowDimension;
  unit: FlowUnit;
  currency: string;
  selectedKey: string | null;
  onDimensionChange: (dimension: FlowDimension) => void;
  onSelect: (key: string | null) => void;
}) {
  const { t } = useTranslation();
  const isValue = unit === "value";
  const maxMagnitude = slices.reduce(
    (max, slice) =>
      Math.max(
        max,
        isValue ? slice.detectedValue : slice.detected,
        isValue ? slice.resolvedValue : slice.resolved,
      ),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 print:hidden">
        <span className="text-2xs text-content-tertiary">{t("analytics.cutBy")}</span>
        {buildDimensions(t).map((entry) => (
          <Button
            key={entry.key}
            variant={dimension === entry.key ? "subtle" : "ghost"}
            size="xs"
            onClick={() => onDimensionChange(entry.key)}
            aria-pressed={dimension === entry.key}
          >
            <Icon name={entry.icon} size="xs" />
            {entry.label}
          </Button>
        ))}
      </div>

      {slices.length === 0 ? (
        <EmptyState
          icon="SearchX"
          title={t("analytics.nothingToBreakDown")}
          description={t("analytics.noCasesFallInsideThe")}
        />
      ) : (
        <>
          <p className="flex items-center gap-3 px-2.5 text-2xs text-content-tertiary">
            <span className="w-24 shrink-0 sm:w-40">{t("analytics.worstFirst")}</span>
            <span className="flex flex-1 items-center justify-between">
              <span className="text-success-content">← resolved</span>
              <span className="text-critical-content">detected →</span>
            </span>
            <span className="w-16 shrink-0 text-right">{t("analytics.net")}</span>
            <span className="w-3 shrink-0" />
          </p>
          <ul className="space-y-0.5">
            {slices.slice(0, 8).map((slice) => (
              <SliceRow
                key={slice.key}
                slice={slice}
                maxMagnitude={maxMagnitude}
                unit={unit}
                currency={currency}
                selected={selectedKey === slice.key}
                onSelect={() => onSelect(slice.key)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * The same window, split by priority band.
 *
 * A flat balance can hide a portfolio quietly trading low-band resolutions for
 * critical-band detections — a deterioration wearing the appearance of
 * stability. This is the panel that exposes it, which is why it sits beside the
 * headline rather than under a tab.
 */
export function BandMixture({
  bands,
  currency,
}: {
  bands: BandFlow[];
  currency: string;
}) {
  const { t } = useTranslation();
  const worst = bands.find((band) => band.band === "CRITICAL");
  const criticalGrowing = worst ? worst.detected > worst.resolved : false;

  return (
    <div className="space-y-2.5">
      {bands.map((band) => {
        const meta = PRIORITY_META[band.band];
        const net = band.detected - band.resolved;
        return (
          <div key={band.band} className="flex items-center gap-3">
            <span className="flex w-20 shrink-0 items-center gap-1.5 sm:w-24">
              <span className={cn("size-1.5 rounded-full", meta.dotClassName)} aria-hidden />
              <span className="text-2xs font-medium text-content">{meta.label}</span>
            </span>

            <span className="flex flex-1 items-center gap-2 text-2xs tabular-nums">
              <span className="text-critical-content">+{band.detected}</span>
              <span className="text-content-tertiary">/</span>
              <span className="text-success-content">−{band.resolved}</span>
            </span>

            <span className="w-14 shrink-0 text-right text-2xs tabular-nums text-content-secondary">
              {band.open} open
            </span>
            <span className="w-16 shrink-0 text-right text-2xs font-semibold tabular-nums text-content">
              {formatMoney(band.openValue, currency, { forceCompact: true })}
            </span>
            <span
              className={cn(
                "w-8 shrink-0 text-right text-2xs font-semibold tabular-nums",
                net > 0
                  ? "text-critical-content"
                  : net < 0
                    ? "text-success-content"
                    : "text-content-tertiary",
              )}
            >
              {net > 0 ? "+" : ""}
              {net}
            </span>
          </div>
        );
      })}

      {criticalGrowing ? (
        <p className="flex items-start gap-1.5 rounded-md border border-critical-line bg-critical-subtle px-2.5 py-2 text-2xs leading-relaxed text-critical-content">
          <Icon name="TriangleAlert" size="xs" className="mt-px shrink-0" />
          <span>
            The critical band is growing regardless of the overall balance. A steady
            headline built on clearing low-band work is a deterioration, not stability.{" "}
            <Link href="/work?band=CRITICAL" className="underline underline-offset-2">
              {t("analytics.openTheCriticalQueue")}
            </Link>
            .
          </span>
        </p>
      ) : null}
    </div>
  );
}

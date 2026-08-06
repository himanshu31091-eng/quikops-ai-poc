"use client";

import * as React from "react";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { MoneyCell } from "@/components/patterns/money-cell";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { ProgressBar } from "@/components/patterns/progress-bar";
import type { User } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import { formatHours, formatPercent } from "@/src/lib/format";
import type { PersonPerformanceRow, PlantPerformanceRow } from "../types";

/**
 * The four performance tables.
 *
 * Two components, four uses: plants render top and bottom from the same table,
 * people render owners and reviewers from the same table. The columns differ
 * enough between plants and people to justify two, and not enough to justify
 * four.
 *
 * Adherence is drawn as a bar rather than a number because the question a
 * manager asks is comparative — who is worse — and a column of bars answers it
 * without reading a single figure.
 */

const HEAD_CLASS =
  "px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-content-tertiary";
const CELL_CLASS = "px-3 py-2 align-middle";

function adherenceTone(pct: number): "success" | "high" | "critical" {
  if (pct >= 90) return "success";
  if (pct >= 75) return "high";
  return "critical";
}

function AdherenceCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={pct} tone={adherenceTone(pct)} className="w-16 shrink-0" />
      <span className="text-2xs tabular-nums text-content-secondary">
        {formatPercent(pct, 0)}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- Plants */

export function PlantPerformanceTable({
  rows,
  emptyMessage,
}: {
  rows: PlantPerformanceRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="Factory"
        title="No plants in this selection"
        description={emptyMessage}
        size="sm"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className={HEAD_CLASS}>Plant</th>
            <th className={cn(HEAD_CLASS, "text-right")}>Cases</th>
            <th className={cn(HEAD_CLASS, "text-right")}>Past SLA</th>
            <th className={HEAD_CLASS}>SLA adherence</th>
            <th className={cn(HEAD_CLASS, "text-right")}>Avg resolve</th>
            <th className={cn(HEAD_CLASS, "text-right")}>At risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.plantCode}
              className="border-b border-line last:border-0 transition-colors duration-150 hover:bg-surface-hover"
            >
              <td className={CELL_CLASS}>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-content">
                    {row.plantName}
                  </p>
                  <p className="truncate font-mono text-2xs text-content-tertiary">
                    {row.plantCode} · {row.country}
                  </p>
                </div>
              </td>
              <td className={cn(CELL_CLASS, "text-right text-xs tabular-nums text-content-secondary")}>
                {row.openCases}
                <span className="text-content-tertiary"> / {row.totalCases}</span>
              </td>
              <td className={cn(CELL_CLASS, "text-right")}>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    row.breached > 0 ? "font-semibold text-critical-content" : "text-content-tertiary",
                  )}
                >
                  {row.breached}
                </span>
              </td>
              <td className={CELL_CLASS}>
                <AdherenceCell pct={row.slaAdherencePct} />
              </td>
              <td className={cn(CELL_CLASS, "text-right text-xs tabular-nums text-content-secondary")}>
                {row.avgResolutionHours === null ? "—" : formatHours(row.avgResolutionHours)}
              </td>
              <td className={cn(CELL_CLASS, "text-right")}>
                <MoneyCell amount={row.revenueAtRisk} compact emphasis="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------- People */

export function PersonPerformanceTable({
  rows,
  people,
  emptyMessage,
  loadLabel,
}: {
  rows: PersonPerformanceRow[];
  people: User[];
  emptyMessage: string;
  /** What the count column is counting — "Owned" or "Reviewed". */
  loadLabel: string;
}) {
  const byId = React.useMemo(
    () => Object.fromEntries(people.map((person) => [person.id, person])),
    [people],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="Users"
        title="Nobody to rank yet"
        description={emptyMessage}
        size="sm"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className={HEAD_CLASS}>Person</th>
            <th className={cn(HEAD_CLASS, "text-right")}>{loadLabel}</th>
            <th className={cn(HEAD_CLASS, "text-right")}>Resolved</th>
            <th className={cn(HEAD_CLASS, "text-right")}>Past SLA</th>
            <th className={HEAD_CLASS}>SLA adherence</th>
            <th className={cn(HEAD_CLASS, "text-right")}>Avg resolve</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const person = byId[row.userId];
            return (
              <tr
                key={row.userId}
                className="border-b border-line last:border-0 transition-colors duration-150 hover:bg-surface-hover"
              >
                <td className={CELL_CLASS}>
                  <div className="flex min-w-0 items-center gap-2">
                    {person ? (
                      <OwnerAvatar user={person} size="sm" showName={false} />
                    ) : (
                      <Icon name="CircleUser" size="sm" className="text-content-tertiary" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-content">{row.name}</p>
                      <p className="truncate text-2xs text-content-tertiary">
                        {row.jobTitle}
                      </p>
                    </div>
                  </div>
                </td>
                <td className={cn(CELL_CLASS, "text-right text-xs tabular-nums text-content-secondary")}>
                  {row.assigned}
                </td>
                <td className={cn(CELL_CLASS, "text-right text-xs tabular-nums text-content-secondary")}>
                  {row.resolved}
                </td>
                <td className={cn(CELL_CLASS, "text-right")}>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      row.breached > 0
                        ? "font-semibold text-critical-content"
                        : "text-content-tertiary",
                    )}
                  >
                    {row.breached}
                  </span>
                </td>
                <td className={CELL_CLASS}>
                  <AdherenceCell pct={row.slaAdherencePct} />
                </td>
                <td className={cn(CELL_CLASS, "text-right text-xs tabular-nums text-content-secondary")}>
                  {row.avgResolutionHours === null
                    ? "—"
                    : formatHours(row.avgResolutionHours)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

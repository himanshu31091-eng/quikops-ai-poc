"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { ROLE_META } from "@/src/config/app-config";
import type { CaseAuditEntry } from "@/src/domain/types";
import { formatTimestamp } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { recentClass, SectionEmpty } from "./primitives";

const SOURCE_META: Record<CaseAuditEntry["source"], { label: string; className: string }> = {
  EVERY_ANGLE: {
    label: "Every Angle",
    className: "border-accent-line bg-accent-subtle text-accent-content",
  },
  RULE_ENGINE: {
    label: "Rule engine",
    className: "border-status-verify-line bg-status-verify-subtle text-status-verify",
  },
  WORK_MANAGER: {
    label: "Work Manager",
    className: "border-line bg-surface-hover text-content-secondary",
  },
  CASE_DETAIL: {
    label: "Case detail",
    className: "border-line bg-surface-hover text-content-secondary",
  },
  API: { label: "API", className: "border-line bg-surface-hover text-content-secondary" },
};

const PAGE_SIZE = 12;

/**
 * The append-only record. Deliberately dense and unglamorous: this is the view
 * a quality auditor reads, so it favours completeness and exact timestamps over
 * narrative — the timeline above is where the story is told.
 */
export const AuditLogCard = React.memo(function AuditLogCard({
  entries,
  recentIds,
}: {
  entries: CaseAuditEntry[];
  recentIds: Set<string>;
}) {
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [source, setSource] = React.useState<CaseAuditEntry["source"] | "ALL">("ALL");

  const filtered = React.useMemo(
    () => (source === "ALL" ? entries : entries.filter((entry) => entry.source === source)),
    [entries, source],
  );

  const visible = filtered.slice(0, limit);
  const remaining = filtered.length - visible.length;

  const sources = React.useMemo(() => {
    const present = new Set(entries.map((entry) => entry.source));
    return (Object.keys(SOURCE_META) as CaseAuditEntry["source"][]).filter((key) =>
      present.has(key),
    );
  }, [entries]);

  return (
    <SectionCard
      title="Audit log"
      subtitle={`${entries.length} entries · append-only`}
      icon="ScrollText"
      flush
      action={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSource("ALL");
              setLimit(PAGE_SIZE);
            }}
            className={cn(
              "rounded-sm px-1.5 py-0.5 text-2xs font-medium transition-colors duration-150",
              source === "ALL"
                ? "bg-surface-active text-content"
                : "text-content-tertiary hover:text-content",
            )}
          >
            All
          </button>
          {sources.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSource(key);
                setLimit(PAGE_SIZE);
              }}
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-2xs font-medium transition-colors duration-150",
                source === key
                  ? "bg-surface-active text-content"
                  : "text-content-tertiary hover:text-content",
              )}
            >
              {SOURCE_META[key].label}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <SectionEmpty
          icon="ScrollText"
          title="No entries for this source"
          description="Change the filter to see the rest of the audit trail."
        />
      ) : (
        <>
          <div className="w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-subtle">
                  <th
                    scope="col"
                    className="w-[164px] px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-content-tertiary"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="w-[160px] px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-content-tertiary"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-content-tertiary"
                  >
                    Action
                  </th>
                  <th
                    scope="col"
                    className="w-[124px] px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-content-tertiary"
                  >
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-line last:border-0 hover:bg-surface-subtle",
                      recentClass(recentIds.has(entry.id)),
                    )}
                  >
                    <td className="px-3 py-2 align-top">
                      <span className="font-mono text-2xs tabular-nums text-content-secondary">
                        {formatTimestamp(entry.at)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="block truncate text-xs text-content">
                        {entry.actorName}
                      </span>
                      <span className="block truncate text-2xs text-content-tertiary">
                        {entry.actorRole ? ROLE_META[entry.actorRole].short : "System"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="block text-xs text-content">{entry.action}</span>
                      {entry.field ? (
                        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-2xs text-content-tertiary">
                          <span className="font-mono">{entry.field}</span>
                          <span className="truncate rounded-sm bg-surface-hover px-1 py-px">
                            {entry.fromValue ?? "—"}
                          </span>
                          <Icon name="ArrowRight" size="xs" />
                          <span className="truncate rounded-sm bg-surface-hover px-1 py-px font-medium text-content-secondary">
                            {entry.toValue ?? "—"}
                          </span>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-sm border px-1.5 py-px text-2xs font-medium",
                          SOURCE_META[entry.source].className,
                        )}
                      >
                        {SOURCE_META[entry.source].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {remaining > 0 ? (
            <div className="border-t border-line px-4 py-2.5">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
              >
                <Icon name="ChevronDown" size="sm" />
                Show {Math.min(remaining, PAGE_SIZE)} more of {remaining}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </SectionCard>
  );
});

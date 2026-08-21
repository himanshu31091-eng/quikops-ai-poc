"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { roleLabel } from "@/src/domain/labels";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import type { CaseTimelineEvent } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { TIMELINE_ICON, TIMELINE_TONE } from "../utils/evidence";
import { recentClass, SectionEmpty } from "./primitives";

/*
 * Text tones use the `-content` token, not the base one. The base colours are
 * sized for fills, borders and icons, where 3:1 is the bar; as 11px label text
 * on their own subtle background they measured 3.58:1 for success and 4.28:1
 * for critical, both under the 4.5:1 that text this small needs. The `-content`
 * variants exist for exactly this position and land at 7.3:1.
 *
 * `verify` keeps its base token: it has no `-content` variant and already
 * measures 5.20:1 on its own subtle background.
 */
const TONE_CLASS: Record<string, string> = {
  neutral: "border-line bg-surface-hover text-content-secondary",
  accent: "border-accent-line bg-accent-subtle text-accent-content",
  success: "border-success-line bg-success-subtle text-success-content",
  critical: "border-critical-line bg-critical-subtle text-critical-content",
  verify: "border-status-verify-line bg-status-verify-subtle text-status-verify",
};

/** Events shown before the list collapses. Older history is one click away. */
const COLLAPSE_AFTER = 8;

const TimelineRow = React.memo(function TimelineRow({
  event,
  isLast,
  isRecent,
}: {
  event: CaseTimelineEvent;
  isLast: boolean;
  isRecent: boolean;
}) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  const tone = TIMELINE_TONE[event.kind];

  return (
    <li
      className={cn(
        "relative flex gap-3 rounded-md pb-4 last:pb-0",
        isRecent ? "anim-settle -mx-2 px-2 pt-2" : "",
        recentClass(isRecent),
      )}
    >
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute left-[15px] top-8 bottom-0 w-px bg-line"
        />
      ) : null}

      <span
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
          TONE_CLASS[tone],
        )}
      >
        <Icon name={TIMELINE_ICON[event.kind]} size="sm" />
      </span>

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium leading-snug text-content">{event.title}</p>
          <span
            title={formatTimestamp(event.at)}
            className="text-2xs tabular-nums text-content-tertiary"
          >
            {formatWhen(event.at, DEMO_NOW, fmt)}
          </span>
          {isRecent ? (
            <span className="rounded-sm bg-accent px-1.5 py-px text-2xs font-semibold text-white">
              {t("common.justNow")}
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 text-2xs text-content-tertiary">
          {event.actorName}
          {event.actorRole ? ` · ${roleLabel(event.actorRole, labels)}` : " · automated"}
        </p>

        {event.detail ? (
          <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">{event.detail}</p>
        ) : null}

        {event.facts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {event.facts.map((fact) => (
              <span
                key={`${event.id}-${fact.label}`}
                className="rounded-sm border border-line bg-surface-subtle px-1.5 py-0.5 text-2xs text-content-secondary"
              >
                <span className="text-content-tertiary">{fact.label}</span> {fact.value}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
});

export const ExecutionTimeline = React.memo(function ExecutionTimeline({
  events,
  recentIds,
}: {
  events: CaseTimelineEvent[];
  recentIds: Set<string>;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = React.useState(false);

  // Newest first is what a manager wants on an active case; the rail still
  // reads top-to-bottom as "most recent, then how we got here".
  const ordered = React.useMemo(
    () => [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [events],
  );

  const hidden = Math.max(0, ordered.length - COLLAPSE_AFTER);
  const visible = expanded ? ordered : ordered.slice(0, COLLAPSE_AFTER);

  return (
    <SectionCard
      title={t("section.timeline")}
      subtitle={`${events.length} events, newest first`}
      icon="Activity"
      flush
    >
      {ordered.length === 0 ? (
        <SectionEmpty
          icon="Activity"
          title={t("cd.nothingYet")}
          description={t("cd.nothingYetHint")}
        />
      ) : (
        <div className="px-4 py-3.5">
          <ol className="min-w-0">
            {visible.map((event, index) => (
              <TimelineRow
                key={event.id}
                event={event}
                isLast={index === visible.length - 1 && hidden === 0}
                isRecent={recentIds.has(event.id)}
              />
            ))}
          </ol>

          {hidden > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-1 w-full"
              onClick={() => setExpanded((prev) => !prev)}
            >
              <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size="sm" />
              {expanded ? "Show recent only" : `Show ${hidden} earlier event${hidden === 1 ? "" : "s"}`}
            </Button>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
});

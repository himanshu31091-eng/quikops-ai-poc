"use client";

import * as React from "react";
import Link from "next/link";
import { ActionToast } from "@/components/patterns/action-toast";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { KpiTileRow, type KpiTileModel } from "@/components/patterns/kpi-tile";
import { ModuleToolbar } from "@/components/patterns/module-toolbar";
import { PageHeader } from "@/components/patterns/page-header";
import { ProgressBar } from "@/components/patterns/progress-bar";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_META } from "@/src/config/app-config";
import { MIN_RANKABLE_SAMPLE } from "@/src/domain/playbook-effectiveness";
import type { PlaybookLibraryData, PlaybookView } from "@/src/data/queries/playbooks";
import { DEMO_NOW } from "@/src/lib/constants";
import { exportPdf, exportTableCsv, type CsvColumn } from "@/src/lib/export";
import { formatHours, formatPercent, formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";

/**
 * The playbook library.
 *
 * Every effectiveness figure is shown with its sample size. With a handful of
 * cases per playbook, a percentage that does not say "of four" is a lie of
 * omission — and the library exists to be trusted, not to look precise.
 */

const CSV_COLUMNS: CsvColumn<PlaybookView>[] = [
  { header: "Playbook", value: (row) => row.name },
  { header: "Exception type", value: (row) => row.exceptionLabel },
  { header: "Version", value: (row) => row.version },
  { header: "Steps", value: (row) => String(row.steps.length) },
  { header: "Cases applied", value: (row) => String(row.effectiveness.sampleSize) },
  { header: "Resolved", value: (row) => String(row.effectiveness.resolvedCount) },
  { header: "Open", value: (row) => String(row.effectiveness.openCount) },
  {
    header: "SLA adherence %",
    value: (row) => (row.effectiveness.slaAdherencePct ?? 0).toFixed(1),
  },
  {
    header: "Mean resolution hours",
    value: (row) =>
      row.effectiveness.meanResolutionHours === null
        ? ""
        : String(row.effectiveness.meanResolutionHours),
  },
  {
    header: "Recurrence %",
    value: (row) => (row.effectiveness.recurrenceRatePct ?? 0).toFixed(1),
  },
  { header: "Score", value: (row) => (row.effectiveness.score ?? "").toString() },
];

function SampleNote({ size }: { size: number }) {
  return (
    <span className="text-2xs text-content-tertiary">
      of {size} case{size === 1 ? "" : "s"}
    </span>
  );
}

const PlaybookCard = React.memo(function PlaybookCard({
  playbook,
  expanded,
  onToggle,
}: {
  playbook: PlaybookView;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { effectiveness: fx } = playbook;
  const rankable = fx.score !== null;

  return (
    <div className="anim-reveal flex min-w-0 flex-col rounded-lg border border-line bg-surface">
      <div className="flex items-start gap-2.5 p-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          <Icon name={playbook.icon} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-content">{playbook.name}</p>
          <p className="truncate text-2xs text-content-tertiary">
            {playbook.exceptionLabel} · {playbook.version} · updated{" "}
            {formatWhen(playbook.updatedAt, DEMO_NOW)}
          </p>
        </div>
        <span className="shrink-0 rounded-sm border border-line bg-surface-subtle px-1.5 py-0.5 text-2xs text-content-secondary">
          {playbook.steps.length} steps
        </span>
      </div>

      <p className="px-3.5 text-2xs leading-relaxed text-content-secondary">
        {playbook.description}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 px-3.5">
        <div className="min-w-0">
          <dt className="text-2xs text-content-tertiary">Cases applied</dt>
          <dd className="text-xs font-semibold tabular-nums text-content">
            {fx.sampleSize}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-content-tertiary">Mean resolution</dt>
          <dd className="text-xs font-semibold tabular-nums text-content">
            {fx.meanResolutionHours === null ? "—" : formatHours(fx.meanResolutionHours)}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="flex items-baseline justify-between text-2xs text-content-tertiary">
            SLA adherence <SampleNote size={fx.sampleSize} />
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <ProgressBar
              value={fx.slaAdherencePct ?? 0}
              tone={
                (fx.slaAdherencePct ?? 0) >= 75
                  ? "success"
                  : (fx.slaAdherencePct ?? 0) >= 50
                    ? "high"
                    : "critical"
              }
              className="flex-1"
            />
            <span className="text-2xs tabular-nums text-content-secondary">
              {fx.slaAdherencePct === null ? "—" : formatPercent(fx.slaAdherencePct, 0)}
            </span>
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="flex items-baseline justify-between text-2xs text-content-tertiary">
            Recurrence after application <SampleNote size={fx.sampleSize} />
          </dt>
          <dd className="mt-1 flex items-center gap-2">
            <ProgressBar
              value={fx.recurrenceRatePct ?? 0}
              tone={(fx.recurrenceRatePct ?? 0) > 40 ? "critical" : "accent"}
              className="flex-1"
            />
            <span className="text-2xs tabular-nums text-content-secondary">
              {fx.recurrenceRatePct === null ? "—" : formatPercent(fx.recurrenceRatePct, 0)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-3.5 py-2.5">
        {rankable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-2xs text-content-tertiary underline decoration-dotted underline-offset-2">
                Effectiveness {fx.score}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              <p className="text-2xs">
                SLA adherence less half the recurrence rate. A play that closes cases
                quickly and lets them come back has not worked.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-2xs text-content-tertiary underline decoration-dotted underline-offset-2">
                Not ranked
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              <p className="text-2xs">
                Fewer than {MIN_RANKABLE_SAMPLE} cases have run this playbook. A score
                over that sample would be noise.
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <Button variant="ghost" size="xs" onClick={() => onToggle(playbook.id)}>
          {expanded ? "Hide steps" : "View steps"}
          <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size="xs" />
        </Button>
      </div>

      {expanded ? (
        <div className="anim-settle border-t border-line px-3.5 py-3">
          <ol className="space-y-2.5">
            {playbook.steps.map((step, index) => (
              <li key={step.title} className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-2xs font-semibold text-content-secondary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-2xs font-medium text-content">{step.title}</p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-content-secondary">
                    {step.description}
                  </p>
                  <p className="mt-0.5 text-2xs text-content-tertiary">
                    {ROLE_META[step.ownerRole].label} · due day {step.dueOffsetDays}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {playbook.activeCases.length > 0 ? (
            <div className="mt-3 border-t border-line pt-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                Running now
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {playbook.activeCases.map((item) => (
                  <Link
                    key={item.caseNo}
                    href={caseHref(item.caseNo)}
                    className="rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-2xs text-content-secondary transition-colors duration-150 hover:border-accent-line hover:text-accent-content"
                  >
                    {item.caseNo}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export function PlaybooksView({ data }: { data: PlaybookLibraryData }) {
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [notice, setNotice] = React.useState<string | null>(null);

  const toggle = React.useCallback((id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visible = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") return data.playbooks;
    return data.playbooks.filter((playbook) =>
      `${playbook.name} ${playbook.exceptionLabel} ${playbook.description} ${playbook.steps
        .map((step) => step.title)
        .join(" ")}`
        .toLowerCase()
        .includes(needle),
    );
  }, [data.playbooks, search]);

  const kpis = React.useMemo<KpiTileModel[]>(() => {
    const applied = data.playbooks.reduce(
      (sum, playbook) => sum + playbook.effectiveness.sampleSize,
      0,
    );
    const ranked = data.playbooks.filter((p) => p.effectiveness.score !== null);
    const best = [...ranked].sort(
      (a, b) => (b.effectiveness.score ?? 0) - (a.effectiveness.score ?? 0),
    )[0];
    const exposure = data.playbooks.reduce(
      (sum, playbook) => sum + playbook.effectiveness.openRevenueAtRisk,
      0,
    );

    return [
      {
        key: "playbooks",
        label: "Playbooks",
        value: data.playbooks.length,
        format: "count",
        footnote: `${data.playbooks.reduce((s, p) => s + p.steps.length, 0)} steps in total`,
        icon: "BookMarked",
        tone: "accent",
      },
      {
        key: "applied",
        label: "Cases running a playbook",
        value: applied,
        format: "count",
        footnote:
          data.uncovered.length === 0
            ? "Every exception type is covered"
            : `${data.uncovered.length} exception type${data.uncovered.length === 1 ? "" : "s"} uncovered`,
        icon: "Rows3",
        tone: data.uncovered.length > 0 ? "high" : "success",
      },
      {
        key: "best",
        label: "Most effective",
        display: best ? best.name.split(" ")[0]! : "—",
        footnote: best
          ? `Score ${best.effectiveness.score} over ${best.effectiveness.sampleSize} cases`
          : `Fewer than ${MIN_RANKABLE_SAMPLE} cases on every playbook`,
        icon: "TrendingUp",
        tone: "success",
      },
      {
        key: "exposure",
        label: "Exposure under management",
        value: exposure,
        format: "currency-compact",
        footnote: "Open revenue at risk on cases running a playbook",
        icon: "DollarSign",
        tone: "neutral",
      },
    ];
  }, [data.playbooks, data.uncovered]);

  const exportCsv = React.useCallback(() => {
    const filename = exportTableCsv({
      moduleSlug: "playbooks",
      rows: visible,
      columns: CSV_COLUMNS,
    });
    setNotice(`Exported ${filename}`);
  }, [visible]);

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="playbooks"
        title="Playbooks"
        description="Reusable corrective-action templates per exception type, with the measured effect of each on resolution time and recurrence."
        meta={
          <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="BookMarked" size="xs" />
            {data.playbooks.length} playbooks · {visible.length} shown
          </span>
        }
      />

      <ModuleToolbar
        search={{
          value: search,
          placeholder: "Search playbooks, steps, exception types",
          ariaLabel: "Search the playbook library",
          onChange: setSearch,
        }}
        isFiltered={search.trim() !== ""}
        onClearAll={() => setSearch("")}
        resultLabel={`${visible.length} playbooks`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Icon name="Download" size="sm" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportPdf}>
              <Icon name="FileText" size="sm" />
              PDF
            </Button>
          </>
        }
      />

      <KpiTileRow kpis={kpis} />

      {notice ? (
        <ActionToast
          message={notice}
          tone="success"
          placement="floating"
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <SectionCard
        title="Library"
        subtitle="Every figure is shown with the sample it was measured over"
        icon="BookMarked"
      >
        {visible.length === 0 ? (
          <EmptyState
            icon="SearchX"
            title="No playbooks match"
            description="Try a different search, or clear it to see the whole library."
            size="sm"
            action={
              <Button variant="secondary" size="md" onClick={() => setSearch("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {visible.map((playbook) => (
              <PlaybookCard
                key={playbook.id}
                playbook={playbook}
                expanded={expanded.has(playbook.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {data.uncovered.length > 0 ? (
        <SectionCard
          title="Coverage gaps"
          subtitle="Exception types raising cases with no playbook behind them"
          icon="TriangleAlert"
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {data.uncovered.map((entry) => (
              <li
                key={entry.exceptionType}
                className="flex items-center justify-between gap-2 rounded-md border border-high-line bg-high-subtle px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs font-medium text-high-content">
                  {entry.label}
                </span>
                <span className="shrink-0 text-2xs tabular-nums text-content-secondary">
                  {entry.caseCount} case{entry.caseCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-2xs leading-relaxed text-content-tertiary">
            Cases of these types still get corrective actions, but they are composed case by
            case rather than from a template — so nothing measures whether the approach works.
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}

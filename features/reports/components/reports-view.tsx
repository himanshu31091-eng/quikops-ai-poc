"use client";

import * as React from "react";
import Link from "next/link";
import { ActionToast } from "@/components/patterns/action-toast";
import { DataTable } from "@/components/patterns/data-table";
import { EmptyState } from "@/components/patterns/empty-state";
import { Icon } from "@/components/patterns/icon";
import { KpiTileRow, type KpiTileModel } from "@/components/patterns/kpi-tile";
import { ModuleToolbar } from "@/components/patterns/module-toolbar";
import { PageHeader } from "@/components/patterns/page-header";
import { PriorityChip } from "@/components/patterns/priority-chip";
import { SectionCard } from "@/components/patterns/section-card";
import { SavedReportsPanel } from "./saved-reports-panel";
import { useSavedReports, type SavedReport } from "../hooks/use-saved-reports";
import { Button } from "@/components/ui/button";
import {
  REPORT_SECTION_META,
  type ReportSection,
} from "@/src/data/fixtures/reports";
import type { ReportsData, RunView, ScheduleView } from "@/src/data/queries/reports";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import {
  exportPdf,
  exportSectionsCsv,
  exportWorkbook,
  buildCsv,
  sheet,
  type XlsSheet,
} from "@/src/lib/export";
import { formatHours, formatMoney, formatPercent, formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";

/**
 * Reports.
 *
 * A template declares which sections it contains; the sections are composed
 * here from `getReportsData().source`, which reads the same portfolio
 * derivations as the dashboard. A report and the screen it came from cannot
 * disagree.
 *
 * The preview *is* the printed document — `print:` variants hide the chrome, so
 * there is no second render path to keep in sync.
 */

export function ReportsView({ data }: { data: ReportsData }) {
  const [selectedId, setSelectedId] = React.useState<string>(
    data.templates[0]?.id ?? "",
  );
  const [search, setSearch] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const saved = useSavedReports();

  const selected = data.templates.find((template) => template.id === selectedId) ?? null;
  const [sections, setSections] = React.useState<Set<ReportSection>>(
    new Set(data.templates[0]?.sections ?? []),
  );

  // Selecting a template resets the section picker to that template's default.
  const previousTemplate = React.useRef(selectedId);
  if (previousTemplate.current !== selectedId) {
    previousTemplate.current = selectedId;
    const next = data.templates.find((t) => t.id === selectedId);
    if (next) setSections(new Set(next.sections));
  }

  const toggleSection = (section: ReportSection) =>
    setSections((previous) => {
      const next = new Set(previous);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });

  const { source } = data;

  const visibleTemplates = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") return data.templates;
    return data.templates.filter((template) =>
      `${template.name} ${template.description} ${template.audienceLabel}`
        .toLowerCase()
        .includes(needle),
    );
  }, [data.templates, search]);

  const kpis = React.useMemo<KpiTileModel[]>(
    () => [
      {
        key: "templates",
        label: "Report templates",
        value: data.templates.length,
        format: "count",
        footnote: "Composable from 7 section types",
        icon: "FileText",
        tone: "accent",
      },
      {
        key: "schedules",
        label: "Active schedules",
        value: data.schedules.filter((s) => s.isEnabled).length,
        format: "count",
        footnote: `${data.schedules.length} configured in total`,
        icon: "CalendarSync",
        tone: "success",
      },
      {
        key: "runs",
        label: "Generated (30 days)",
        value: data.runs.length,
        format: "count",
        footnote: `${data.runs.filter((r) => r.status === "FAILED").length} failed`,
        icon: "History",
        tone: data.runs.some((r) => r.status === "FAILED") ? "high" : "neutral",
      },
      {
        key: "recipients",
        label: "Recipients",
        value: new Set(data.schedules.flatMap((s) => s.recipients)).size,
        format: "count",
        footnote: "Distinct people on a distribution list",
        icon: "Users",
        tone: "neutral",
      },
    ],
    [data],
  );

  /**
   * The same report as a workbook rather than a flattened CSV.
   *
   * Each section becomes its own sheet, which is what a section *is* — the CSV
   * path has to interleave them with title rows and let Excel guess at every
   * value. Here a count arrives as a number and a plant code stays a string.
   */
  /**
   * Applying a saved report restores the template and the section selection
   * together. Setting the template alone would reset the sections to that
   * template's default — the ref-based reset below fires on any template change
   * — so the ref is advanced first and the sections written after.
   */
  const applySaved = React.useCallback((report: SavedReport) => {
    previousTemplate.current = report.templateId;
    setSelectedId(report.templateId);
    setSections(new Set(report.sections));
    setNotice(`Applied "${report.name}"`);
  }, []);

  const saveCurrent = React.useCallback(
    (name: string) => {
      if (!selected) return;
      const entry = saved.save({
        name,
        templateId: selected.id,
        sections: [...sections],
        savedAt: DEMO_NOW.toISOString(),
      });
      if (entry) setNotice(`Saved "${entry.name}"`);
    },
    [saved, selected, sections],
  );

  const templateNameFor = React.useCallback(
    (templateId: string) =>
      data.templates.find((template) => template.id === templateId)?.name ??
      "Unknown template",
    [data.templates],
  );

  const exportExcel = React.useCallback(() => {
    if (!selected) return;
    const sheets: XlsSheet<never>[] = [];

    if (sections.has("headline")) {
      sheets.push(sheet({
        name: "Headline",
        rows: [source.counts],
        columns: [
          { header: "Open cases", value: (r) => r.open },
          { header: "Revenue at risk", value: (r) => r.revenueAtRisk, width: 16 },
          { header: "Past SLA", value: (r) => r.breached },
          { header: "Unassigned", value: (r) => r.unassigned },
          { header: "Critical", value: (r) => r.openCritical },
        ],
      }));
    }

    if (sections.has("plant-performance")) {
      sheets.push(sheet({
        name: "Plant performance",
        rows: source.plants,
        columns: [
          { header: "Plant", value: (r) => r.code },
          { header: "Name", value: (r) => r.name, width: 20 },
          { header: "Country", value: (r) => r.country, width: 16 },
          { header: "Open cases", value: (r) => r.openCases },
          { header: "Critical", value: (r) => r.criticalCases },
          { header: "Revenue at risk", value: (r) => r.revenueAtRisk, width: 16 },
          { header: "SLA adherence %", value: (r) => r.slaAdherencePct, width: 16 },
        ],
      }));
    }

    if (sections.has("case-list")) {
      sheets.push(sheet({
        name: "Open cases",
        rows: source.openCases,
        columns: [
          { header: "Case", value: (r) => r.caseNo, width: 16 },
          { header: "Title", value: (r) => r.title, width: 44 },
          { header: "Plant", value: (r) => r.plantCode },
          { header: "Priority", value: (r) => r.priorityBand },
          { header: "Score", value: (r) => r.priorityScore },
          { header: "Owner", value: (r) => r.owner?.name ?? "Unassigned", width: 20 },
          { header: "Revenue at risk", value: (r) => r.revenueAtRisk, width: 16 },
          { header: "Opened", value: (r) => r.openedAt, width: 22 },
        ],
      }));
    }

    if (sheets.length === 0) return;
    const filename = exportWorkbook(`report-${selected.id}`, sheets);
    setNotice(`Exported ${filename}`);
  }, [selected, sections, source]);

  const exportCsv = React.useCallback(() => {
    if (!selected) return;
    const parts: { title: string; csv: string }[] = [];

    if (sections.has("headline")) {
      parts.push({
        title: "Headline position",
        csv: buildCsv(
          [source.counts],
          [
            { header: "Open cases", value: (r) => String(r.open) },
            { header: "Revenue at risk", value: (r) => String(r.revenueAtRisk) },
            { header: "Past SLA", value: (r) => String(r.breached) },
            { header: "Unassigned", value: (r) => String(r.unassigned) },
            { header: "Critical", value: (r) => String(r.openCritical) },
          ],
        ),
      });
    }
    if (sections.has("plant-performance")) {
      parts.push({
        title: "Plant performance",
        csv: buildCsv(source.plants, [
          { header: "Plant", value: (r) => r.name },
          { header: "Open cases", value: (r) => String(r.openCases) },
          { header: "Critical", value: (r) => String(r.criticalCases) },
          { header: "Revenue at risk", value: (r) => String(r.revenueAtRisk) },
          { header: "SLA adherence %", value: (r) => r.slaAdherencePct.toFixed(1) },
        ]),
      });
    }
    if (sections.has("supplier-exposure")) {
      parts.push({
        title: "Supplier exposure",
        csv: buildCsv(source.supplierExposure, [
          { header: "Supplier", value: (r) => r.supplierName },
          { header: "Open cases", value: (r) => String(r.openCases) },
          { header: "Revenue at risk", value: (r) => String(r.revenueAtRisk) },
          { header: "Worst recurrence", value: (r) => String(r.maxRecurrence) },
        ]),
      });
    }
    if (sections.has("case-list")) {
      parts.push({
        title: "Open cases",
        csv: buildCsv(source.openCases, [
          { header: "Case", value: (r) => r.caseNo },
          { header: "Title", value: (r) => r.title },
          { header: "Priority", value: (r) => r.priorityBand },
          { header: "Score", value: (r) => r.priorityScore.toFixed(1) },
          { header: "Plant", value: (r) => r.plant.name },
          { header: "Owner", value: (r) => r.owner?.name ?? "Unassigned" },
          { header: "Revenue at risk", value: (r) => String(r.revenueAtRisk) },
        ]),
      });
    }

    const filename = exportSectionsCsv("report", selected.name, parts);
    setNotice(`Exported ${filename}`);
  }, [selected, sections, source]);

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 6_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="reports"
        title="Reports"
        description="Scheduled and on-demand executive and audit reporting, composed from the same figures the dashboard reads."
        meta={
          <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="FileText" size="xs" />
            {data.templates.length} templates · {data.schedules.filter((s) => s.isEnabled).length} active schedules
          </span>
        }
      />

      <ModuleToolbar
        search={{
          value: search,
          placeholder: "Search report templates",
          ariaLabel: "Search report templates",
          onChange: setSearch,
        }}
        isFiltered={search.trim() !== ""}
        onClearAll={() => setSearch("")}
        resultLabel={`${visibleTemplates.length} templates`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!selected}>
              <Icon name="Download" size="sm" />
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={exportExcel} disabled={!selected}>
              <Icon name="Sheet" size="sm" />
              Excel
            </Button>
            <Button variant="primary" size="sm" onClick={exportPdf} disabled={!selected}>
              <Icon name="FileText" size="sm" />
              Generate PDF
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

      <div className="grid gap-4 xl:grid-cols-12">
        {/* Library + builder */}
        <div className="min-w-0 space-y-4 xl:col-span-4 print:hidden">
          <SectionCard title="Report library" subtitle="Pick a template to compose" icon="FileText">
            {visibleTemplates.length === 0 ? (
              <EmptyState
                icon="SearchX"
                title="No templates match"
                description="Try a different search term."
                size="sm"
              />
            ) : (
              <ul className="space-y-2">
                {visibleTemplates.map((template) => (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(template.id)}
                      aria-pressed={template.id === selectedId}
                      className={cn(
                        "flex w-full min-w-0 items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors duration-150",
                        template.id === selectedId
                          ? "border-accent bg-accent-subtle"
                          : "border-line bg-surface hover:bg-surface-hover",
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface text-accent">
                        <Icon name={template.icon} size="sm" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-content">
                          {template.name}
                        </span>
                        <span className="mt-0.5 block text-2xs leading-relaxed text-content-secondary">
                          {template.description}
                        </span>
                        <span className="mt-1 block text-2xs text-content-tertiary">
                          For {template.audienceLabel} · {template.sections.length} sections
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Saved reports"
            subtitle="The template and the sections you kept, together"
            icon="BookMarked"
          >
            <SavedReportsPanel
              reports={saved.reports}
              isReady={saved.isReady}
              currentTemplateName={selected?.name ?? null}
              sectionCount={sections.size}
              onSave={saveCurrent}
              onApply={applySaved}
              onRemove={saved.remove}
              templateNameFor={templateNameFor}
            />
          </SectionCard>

          <SectionCard
            title="Sections"
            subtitle="Toggle what this report contains"
            icon="Filter"
          >
            <ul className="space-y-1.5">
              {(Object.keys(REPORT_SECTION_META) as ReportSection[]).map((section) => {
                const meta = REPORT_SECTION_META[section];
                const on = sections.has(section);
                return (
                  <li key={section}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleSection(section)}
                      className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-surface-hover"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150",
                          on ? "border-accent bg-accent text-white" : "border-line-strong bg-surface",
                        )}
                      >
                        {on ? <Icon name="Check" size="xs" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-2xs font-medium text-content">
                          {meta.label}
                        </span>
                        <span className="block text-2xs text-content-tertiary">
                          {meta.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>

        {/* Preview — this is the printed document */}
        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title={selected ? selected.name : "Preview"}
            subtitle={`Generated ${formatWhen(DEMO_NOW.toISOString(), DEMO_NOW)} · ${sections.size} sections`}
            icon="Sparkles"
          >
            {sections.size === 0 ? (
              <EmptyState
                icon="FileText"
                title="No sections selected"
                description="Choose at least one section to compose a report."
                size="sm"
              />
            ) : (
              <div className="space-y-5">
                {sections.has("headline") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">Headline position</h3>
                    <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: "Open cases", value: String(source.counts.open) },
                        { label: "Revenue at risk", value: formatMoney(source.counts.revenueAtRisk) },
                        { label: "Past SLA", value: String(source.counts.breached) },
                        { label: "Unassigned", value: String(source.counts.unassigned) },
                      ].map((entry) => (
                        <div key={entry.label} className="rounded-md border border-line p-2.5">
                          <dt className="text-2xs text-content-tertiary">{entry.label}</dt>
                          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-content">
                            {entry.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}

                {sections.has("sla-compliance") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">SLA compliance</h3>
                    <p className="mt-1.5 text-2xs leading-relaxed text-content-secondary">
                      Adherence is {formatPercent(source.metrics.slaAdherencePct)} across the
                      corpus, with mean time to resolve at {formatHours(source.metrics.mttrHours)}.
                      {source.breachedCases.length} open case
                      {source.breachedCases.length === 1 ? " is" : "s are"} currently past target.
                    </p>
                  </section>
                ) : null}

                {sections.has("plant-performance") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">Plant performance</h3>
                    <div className="mt-2">
                      <DataTable
                        rows={source.plants}
                        columns={[
                          { key: "plant", label: "Plant", render: (r) => r.name },
                          { key: "open", label: "Open", align: "right", render: (r) => r.openCases },
                          { key: "crit", label: "Critical", align: "right", render: (r) => r.criticalCases },
                          {
                            key: "risk",
                            label: "At risk",
                            align: "right",
                            render: (r) => formatMoney(r.revenueAtRisk, "USD", { forceCompact: true }),
                          },
                          {
                            key: "sla",
                            label: "SLA",
                            align: "right",
                            render: (r) => formatPercent(r.slaAdherencePct, 0),
                          },
                        ]}
                        rowKey={(r) => r.code}
                        minWidthClass="min-w-0"
                        empty={{ icon: "Factory", title: "No plants", description: "" }}
                      />
                    </div>
                  </section>
                ) : null}

                {sections.has("supplier-exposure") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">Supplier exposure</h3>
                    <div className="mt-2">
                      <DataTable
                        rows={source.supplierExposure}
                        columns={[
                          { key: "s", label: "Supplier", render: (r) => r.supplierName },
                          { key: "c", label: "Open cases", align: "right", render: (r) => r.openCases },
                          {
                            key: "r",
                            label: "At risk",
                            align: "right",
                            render: (r) => formatMoney(r.revenueAtRisk, "USD", { forceCompact: true }),
                          },
                          { key: "rec", label: "Worst recurrence", align: "right", render: (r) => r.maxRecurrence },
                        ]}
                        rowKey={(r) => r.supplierName}
                        minWidthClass="min-w-0"
                        empty={{
                          icon: "TruckElectric",
                          title: "No concentrated exposure",
                          description: "No supplier carries more than one open case.",
                        }}
                      />
                    </div>
                  </section>
                ) : null}

                {sections.has("execution-metrics") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">Execution metrics</h3>
                    <p className="mt-1.5 text-2xs leading-relaxed text-content-secondary">
                      Verification pass rate {formatPercent(source.metrics.verificationPassRatePct)},
                      recurrence {formatPercent(source.metrics.recurrenceRatePct)}.{" "}
                      {source.metrics.casesClosedThisWeek} cases resolved this week against{" "}
                      {source.metrics.casesOpenedThisWeek} opened.
                    </p>
                  </section>
                ) : null}

                {sections.has("case-list") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">
                      Open cases ({source.openCases.length})
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {source.openCases.slice(0, 10).map((item) => (
                        <li
                          key={item.caseNo}
                          className="flex items-center gap-2 border-b border-line pb-1 last:border-0"
                        >
                          <PriorityChip band={item.priorityBand} size="sm" />
                          <Link
                            href={caseHref(item.caseNo)}
                            className="font-mono text-2xs text-accent hover:underline"
                          >
                            {item.caseNo}
                          </Link>
                          <span className="min-w-0 flex-1 truncate text-2xs text-content-secondary">
                            {item.title}
                          </span>
                          <span className="shrink-0 text-2xs tabular-nums text-content-tertiary">
                            {formatMoney(item.revenueAtRisk, item.currency, { forceCompact: true })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {source.openCases.length > 10 ? (
                      <p className="mt-1.5 text-2xs text-content-tertiary">
                        +{source.openCases.length - 10} more in the full export.
                      </p>
                    ) : null}
                  </section>
                ) : null}

                {sections.has("audit-extract") ? (
                  <section>
                    <h3 className="text-xs font-semibold text-content">Audit extract</h3>
                    <p className="mt-1.5 text-2xs leading-relaxed text-content-secondary">
                      The full append-only record is available on the{" "}
                      <Link href="/system/audit" className="text-accent hover:underline">
                        Audit Log
                      </Link>
                      , filterable by actor, action, source and plant, and exportable to CSV.
                    </p>
                  </section>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Schedules + history */}
      <div className="grid gap-4 xl:grid-cols-2 print:hidden">
        <SectionCard
          title="Schedules"
          subtitle="Cadence, recipients and next run"
          icon="CalendarSync"
          flush
        >
          <DataTable<ScheduleView>
            rows={data.schedules}
            columns={[
              { key: "t", label: "Report", render: (r) => r.templateName },
              { key: "c", label: "Cadence", className: "w-28", render: (r) => r.cadenceLabel },
              {
                key: "r",
                label: "Recipients",
                className: "w-24",
                align: "right",
                render: (r) => r.recipients.length,
              },
              {
                key: "n",
                label: "Next run",
                className: "w-32",
                render: (r) =>
                  r.isEnabled && r.nextRunAt ? (
                    <span className="text-2xs text-content-secondary">
                      {formatWhen(r.nextRunAt, DEMO_NOW)}
                    </span>
                  ) : (
                    <span className="text-2xs text-content-tertiary">Paused</span>
                  ),
              },
            ]}
            rowKey={(r) => r.id}
            minWidthClass="min-w-0"
            empty={{
              icon: "CalendarSync",
              title: "No schedules",
              description: "Every report is generated on demand.",
            }}
          />
        </SectionCard>

        <SectionCard
          title="Run history"
          subtitle="Recent generations, newest first"
          icon="History"
          flush
        >
          <DataTable<RunView>
            rows={data.runs}
            columns={[
              { key: "t", label: "Report", render: (r) => r.templateName },
              {
                key: "w",
                label: "Generated",
                className: "w-32",
                render: (r) => (
                  <span className="text-2xs text-content-secondary">
                    {formatWhen(r.generatedAt, DEMO_NOW)}
                  </span>
                ),
              },
              {
                key: "s",
                label: "Status",
                className: "w-28",
                render: (r) => (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
                      r.status === "DELIVERED"
                        ? "border-success-line bg-success-subtle text-success-content"
                        : r.status === "FAILED"
                          ? "border-critical-line bg-critical-subtle text-critical-content"
                          : "border-accent-line bg-accent-subtle text-accent-content",
                    )}
                  >
                    {r.status.toLowerCase()}
                  </span>
                ),
              },
              { key: "r", label: "Rows", className: "w-20", align: "right", render: (r) => r.rowCount },
              { key: "f", label: "Format", className: "w-20", render: (r) => r.format },
            ]}
            rowKey={(r) => r.id}
            minWidthClass="min-w-0"
            empty={{
              icon: "History",
              title: "No runs yet",
              description: "No report has been generated in this period.",
            }}
          />
        </SectionCard>
      </div>
    </div>
  );
}

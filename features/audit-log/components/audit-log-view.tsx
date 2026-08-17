"use client";

import * as React from "react";
import Link from "next/link";
import { ActionToast } from "@/components/patterns/action-toast";
import { DataTable, type DataTableColumn } from "@/components/patterns/data-table";
import { Icon } from "@/components/patterns/icon";
import { KpiTileRow } from "@/components/patterns/kpi-tile";
import { ModuleToolbar } from "@/components/patterns/module-toolbar";
import { PageHeader } from "@/components/patterns/page-header";
import { useTranslation } from "@/src/i18n/provider";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { AUDIT_SOURCE_LABEL, ROLE_META } from "@/src/config/app-config";
import type { AuditEntryRow, AuditLogData } from "@/src/data/queries/audit";
import { DEMO_NOW } from "@/src/lib/constants";
import { cn } from "@/src/lib/cn";
import { formatTimestamp, formatWhen } from "@/src/lib/format";
import { caseHref } from "@/src/lib/routes";
import { exportPdf } from "@/src/lib/export";
import {
  useAuditLog,
  type AuditFilterField,
  type AuditSortKey,
} from "../hooks/use-audit-log";

/**
 * Module root. Composition only — the state lives in useAuditLog, the chrome in
 * the shared patterns, and this file is the wiring.
 */

const SOURCE_TONE: Record<string, string> = {
  EVERY_ANGLE: "bg-medium-subtle text-medium-content border-medium-line",
  RULE_ENGINE: "bg-accent-subtle text-accent-content border-accent-line",
  CASE_DETAIL: "bg-surface-hover text-content-secondary border-line",
  WORK_MANAGER: "bg-surface-hover text-content-secondary border-line",
  API: "bg-high-subtle text-high-content border-high-line",
};

export function AuditLogView({ data }: { data: AuditLogData }) {
  const { t } = useTranslation();
  const api = useAuditLog(data);

  const columns = React.useMemo<DataTableColumn<AuditEntryRow, AuditSortKey>[]>(
    () => [
      {
        key: "at",
        label: t("col.when"),
        sortKey: "at",
        className: "w-40",
        render: (row) => (
          <span className="block">
            <span className="block text-2xs text-content">{formatWhen(row.at, DEMO_NOW)}</span>
            <span className="block font-mono text-2xs text-content-tertiary">
              {formatTimestamp(row.at)}
            </span>
          </span>
        ),
      },
      {
        key: "actor",
        label: t("col.actor"),
        sortKey: "actor",
        className: "w-44",
        render: (row) => (
          <span className="block min-w-0">
            <span className="block truncate text-2xs font-medium text-content">
              {row.actorName}
            </span>
            <span className="block truncate text-2xs text-content-tertiary">
              {row.actorRole ? ROLE_META[row.actorRole].label : t("col.system")}
            </span>
          </span>
        ),
      },
      {
        key: "action",
        label: t("col.action"),
        sortKey: "action",
        render: (row) => (
          <span className="block min-w-0">
            <span className="block truncate text-2xs text-content">{row.action}</span>
            {row.field ? (
              <span className="mt-0.5 flex flex-wrap items-center gap-1 text-2xs text-content-tertiary">
                <span className="font-mono">{row.field}</span>
                {row.fromValue ? (
                  <>
                    <span className="line-through opacity-70">{row.fromValue}</span>
                    <Icon name="ArrowRight" size="xs" />
                  </>
                ) : null}
                {row.toValue ? (
                  <span className="font-medium text-content-secondary">{row.toValue}</span>
                ) : null}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "case",
        label: t("col.case"),
        sortKey: "case",
        className: "w-36",
        render: (row) =>
          row.caseNo === "—" ? (
            <span className="text-2xs text-content-tertiary">—</span>
          ) : (
            <Link
              href={caseHref(row.caseNo)}
              onClick={(event) => event.stopPropagation()}
              className="block font-mono text-2xs text-accent transition-colors duration-150 hover:underline"
            >
              {row.caseNo}
            </Link>
          ),
      },
      {
        key: "source",
        label: t("col.source"),
        sortKey: "source",
        className: "w-32",
        render: (row) => (
          <span
            className={cn(
              "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-2xs font-medium",
              SOURCE_TONE[row.source] ?? SOURCE_TONE.CASE_DETAIL,
            )}
          >
            {AUDIT_SOURCE_LABEL[row.source].toLowerCase()}
          </span>
        ),
      },
    ],
    // The column headers come from the catalogue, so they are rebuilt when the
    // language changes rather than frozen at first render.
    [t],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        docKey="audit"
        title={t("page.audit.title")}
        description={t("page.audit.description")}
        meta={
          <>
            <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <Icon name="Clock" size="xs" />
              Data as at {formatTimestamp(DEMO_NOW)} UTC
            </span>
            <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
              <Icon name="ScrollText" size="xs" />
              {api.rows.length} of {api.rows.length + 0} entries in scope
            </span>
            {api.sessionCount > 0 ? (
              <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
                <Icon name="PenLine" size="xs" />
                {api.sessionCount} recorded this session
              </span>
            ) : null}
          </>
        }
      />

      <ModuleToolbar<AuditFilterField>
        search={{
          value: api.filters.search,
          placeholder: "Search actors, actions, cases, values",
          ariaLabel: "Search the audit log",
          onChange: api.setSearch,
        }}
        facets={[
          {
            field: "actors",
            label: t("col.actor"),
            icon: "Users",
            options: api.facets.actors,
            selected: api.filters.actors,
            searchable: true,
          },
          {
            field: "actions",
            label: t("col.action"),
            icon: "Activity",
            options: api.facets.actions,
            selected: api.filters.actions,
            searchable: true,
          },
          {
            field: "sources",
            label: t("col.source"),
            icon: "PlugZap",
            options: api.facets.sources,
            selected: api.filters.sources,
          },
          {
            field: "plants",
            label: t("col.plant"),
            icon: "Factory",
            options: api.facets.plants,
            selected: api.filters.plants,
          },
        ]}
        onToggleFacet={api.toggleFilterValue}
        onClearFacet={api.clearFilterField}
        chips={api.chips}
        onRemoveChip={api.removeChip}
        isFiltered={api.isFiltered}
        onClearAll={api.clearFilters}
        resultLabel={`${api.rows.length} entries`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={api.exportCsv}>
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

      <KpiTileRow kpis={api.kpis} />

      {api.notice ? (
        <ActionToast
          message={api.notice}
          tone="success"
          placement="floating"
          onDismiss={api.dismissNotice}
        />
      ) : null}

      <SectionCard
        title={t("audit.trail")}
        subtitle={t("au.newestFirst")}
        icon="ScrollText"
        flush
      >
        <DataTable<AuditEntryRow, AuditSortKey>
          rows={api.pageRows}
          columns={columns}
          rowKey={(row) => row.id}
          minWidthClass="min-w-200"
          sort={api.table.sort}
          onToggleSort={api.table.toggleSort}
          page={api.table.page}
          pageCount={api.table.pageCount}
          totalCount={api.rows.length}
          onSetPage={api.table.setPage}
          resultLabel={`${api.rows.length} audit entries`}
          empty={{
            icon: api.isFiltered ? "SearchX" : "ScrollText",
            title: api.isFiltered ? "No entries match these filters" : "No audit entries",
            description: api.isFiltered
              ? "Widen the filters, or clear them to see the whole record."
              : "Nothing has been recorded against any case yet.",
            ...(api.isFiltered
              ? {
                  action: (
                    <Button variant="secondary" size="md" onClick={api.clearFilters}>
                      <Icon name="X" size="sm" />
                      {t("common.clearFilters")}
                    </Button>
                  ),
                }
              : {}),
          }}
        />
      </SectionCard>
    </div>
  );
}

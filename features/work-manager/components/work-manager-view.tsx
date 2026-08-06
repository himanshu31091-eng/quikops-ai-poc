"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/patterns/icon";
import { ActionToast } from "@/components/patterns/action-toast";
import { PageHeader } from "@/components/patterns/page-header";
import type { WorkPortfolioMetrics } from "@/src/data/queries/work";
import type { CaseListItem, Plant, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatNumber, formatTimestamp } from "@/src/lib/format";
import { useWorkManager } from "../hooks/use-work-manager";
import type { NewCaseDraft } from "../types";
import { buildFacets } from "../utils/facets";
import type { WorkViewState } from "../utils/query-state";
import { caseHref } from "@/src/lib/routes";
import { CaseBoard } from "./case-board";
import { CaseCardList } from "./case-card-list";
import { CaseTable } from "./case-table";
import { CreateCaseDialog } from "./create-case-dialog";
import { FilterBar } from "./filter-bar";
import { InsightsPanel } from "./insights-panel";
import { SelectionSummary } from "./selection-summary";
import { WorkKpiHeader } from "./work-kpi-header";
import { NoDataState, NoResultsState } from "./work-states";
import { WorkToolbar } from "./work-toolbar";

interface WorkManagerViewProps {
  cases: CaseListItem[];
  plants: Plant[];
  assignableUsers: User[];
  portfolio: WorkPortfolioMetrics;
  sessionUser: User;
  initialState: WorkViewState;
}

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
      <Icon name={icon} size="xs" />
      {children}
    </span>
  );
}

/**
 * Module root. Owns nothing except composition: state lives in useWorkManager,
 * presentation lives in the components below, and this file is the wiring
 * between them.
 */
export function WorkManagerView({
  cases,
  plants,
  assignableUsers,
  portfolio,
  sessionUser,
  initialState,
}: WorkManagerViewProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);

  const manager = useWorkManager({
    cases,
    plants,
    assignableUsers,
    sessionUser,
    initial: initialState,
  });

  const facets = React.useMemo(
    () => buildFacets(manager.allRows, plants, assignableUsers),
    [manager.allRows, plants, assignableUsers],
  );

  const openCase = React.useCallback(
    (caseNo: string) => router.push(caseHref(caseNo)),
    [router],
  );

  // Stable callbacks + the selection array, rather than the whole manager
  // object: `manager` is recreated every render, so depending on it would defeat
  // the memoisation on the toolbar and the table.
  const { assignCases, closeCases, createCase: create, selectedRows } = manager;

  const selectedIdList = React.useMemo(
    () => selectedRows.map((row) => row.id),
    [selectedRows],
  );

  const bulkAssign = React.useCallback(
    (userId: string) => assignCases(selectedIdList, userId),
    [assignCases, selectedIdList],
  );

  const bulkClose = React.useCallback(
    () => closeCases(selectedIdList),
    [closeCases, selectedIdList],
  );

  const createCase = React.useCallback(
    (draft: NewCaseDraft) => create(draft),
    [create],
  );

  const hasData = manager.allRows.length > 0;
  const hasResults = manager.rows.length > 0;

  const content = !hasData ? (
    <NoDataState onCreate={() => setCreateOpen(true)} />
  ) : !hasResults ? (
    <NoResultsState
      filterCount={manager.chips.length}
      totalCount={manager.allRows.length}
      onClearFilters={manager.clearFilters}
    />
  ) : manager.view === "board" ? (
    <CaseBoard
      rows={manager.rows}
      selectedIds={manager.selectedIds}
      users={assignableUsers}
      sessionUser={sessionUser}
      onToggleSelect={manager.toggleRow}
      onOpen={openCase}
      onAssign={manager.assignCases}
      onMove={manager.moveCases}
      onClose={manager.closeCases}
      onNotify={manager.notify}
    />
  ) : (
    <>
      <div className="hidden lg:block">
        <CaseTable
          rows={manager.rows}
          selectedIds={manager.selectedIds}
          sort={manager.sort}
          users={assignableUsers}
          sessionUser={sessionUser}
          onSort={manager.toggleSort}
          onToggleSelect={manager.toggleRow}
          onToggleAll={manager.toggleAllVisible}
          onOpen={openCase}
          onAssign={manager.assignCases}
          onMove={manager.moveCases}
          onClose={manager.closeCases}
          onNotify={manager.notify}
        />
      </div>
      <div className="lg:hidden">
        <CaseCardList
          rows={manager.rows}
          selectedIds={manager.selectedIds}
          users={assignableUsers}
          sessionUser={sessionUser}
          onToggleSelect={manager.toggleRow}
          onOpen={openCase}
          onAssign={manager.assignCases}
          onMove={manager.moveCases}
          onClose={manager.closeCases}
          onNotify={manager.notify}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Work Manager"
        description="Every operational case Every Angle has detected, in one queue — triage it, own it, execute it, verify it."
        meta={
          <>
            <MetaChip icon="Clock">Data as at {formatTimestamp(DEMO_NOW)} UTC</MetaChip>
            <MetaChip icon="Rows3">
              {formatNumber(manager.allRows.length)} cases across{" "}
              {formatNumber(plants.length)} plants
            </MetaChip>
            <MetaChip icon="ShieldCheck">
              Priority scored by rule set · every change audit logged
            </MetaChip>
          </>
        }
      />

      <WorkKpiHeader kpis={manager.kpis} onToggle={manager.toggleKpi} />

      <div className="grid min-w-0 gap-4 2xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-3 2xl:col-span-9">
          <WorkToolbar
            search={manager.filters.search}
            onSearchChange={manager.setSearch}
            view={manager.view}
            onViewChange={manager.setView}
            onExport={manager.exportVisible}
            onRefresh={manager.refresh}
            onCreate={() => setCreateOpen(true)}
            isRefreshing={manager.isRefreshing}
            resultCount={manager.rows.length}
            dirtyCount={manager.dirtyCount}
            onDiscardChanges={manager.discardChanges}
            selectedRows={manager.selectedRows}
            users={assignableUsers}
            sessionUser={sessionUser}
            onBulkAssign={bulkAssign}
            onBulkClose={bulkClose}
          />

          <FilterBar
            facets={facets}
            filters={manager.filters}
            sort={manager.sort}
            resultCount={manager.rows.length}
            totalCount={manager.allRows.length}
            isFiltered={manager.isFiltered}
            onToggleValue={manager.toggleFilterValue}
            onClearField={manager.clearFilterField}
            onClearAll={manager.clearFilters}
            onSort={manager.toggleSort}
          />

          {manager.notice ? (
            <ActionToast
              message={manager.notice.message}
              tone={manager.notice.tone}
              onDismiss={manager.dismissNotice}
            />
          ) : null}

          <SelectionSummary
            selectedRows={manager.selectedRows}
            onClear={manager.clearSelection}
          />

          <section
            aria-label="Operational cases"
            aria-busy={manager.isStale}
            className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface"
          >
            {content}
          </section>
        </div>

        <aside className="min-w-0 2xl:col-span-3">
          <div className="2xl:sticky 2xl:top-[calc(var(--spacing-topbar)+1rem)]">
            <InsightsPanel
              className="lg:grid-cols-2 2xl:grid-cols-1"
              chips={manager.chips}
              quickStats={manager.quickStats}
              portfolio={portfolio}
              resultCount={manager.rows.length}
              totalCount={manager.allRows.length}
              onRemoveChip={manager.removeChip}
              onClearAll={manager.clearFilters}
            />
          </div>
        </aside>
      </div>

      <CreateCaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        plants={plants}
        users={assignableUsers}
        onCreate={createCase}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { ActionToast } from "@/components/patterns/action-toast";
import { AssignMenu } from "@/components/patterns/assign-menu";
import { Icon } from "@/components/patterns/icon";
import { PageHeader } from "@/components/patterns/page-header";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { FirstUseTip } from "@/components/patterns/in-app-tip";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import type { ActionCenterData } from "@/src/data/queries/actions";
import type { User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp } from "@/src/lib/format";
import { useActionCenter } from "../hooks/use-action-center";
import { ActionDrawer } from "./action-drawer";
import { ActionKpiHeader } from "./action-kpi-header";
import { ActionQueue } from "./action-queue";
import {
  BulkActionBar,
  DeadlinesPanel,
  QueueSummary,
  QuickActionsPanel,
  RecommendationsPanel,
} from "./action-sidebar";
import { ActionToolbar } from "./action-toolbar";
import { CreateActionDialog } from "./create-action-dialog";

/**
 * Module root. Owns composition and nothing else: the session state lives in
 * useActionCenter, the presentation lives in the panels, and this file is the
 * wiring plus the 70/30 layout.
 */

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
      <Icon name={icon} size="xs" />
      {children}
    </span>
  );
}

interface ActionCenterViewProps {
  data: ActionCenterData;
  sessionUser: User;
}

export function ActionCenterView({ data, sessionUser }: ActionCenterViewProps) {
  const fmt = useFormat();
  const { t } = useTranslation();
  const api = useActionCenter(data, sessionUser);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [appliedIds, setAppliedIds] = React.useState<Set<string>>(new Set());

  // Destructured before use in callbacks: `api` is a fresh object every render,
  // and depending on it would defeat every React.memo below.
  const {
    applyRecommendation,
    completeActions,
    escalateActions,
    exportVisible,
    notify,
    selectedRows,
  } = api;

  const applyAndRemember = React.useCallback(
    (id: string) => {
      applyRecommendation(id);
      setAppliedIds((previous) => new Set(previous).add(id));
    },
    [applyRecommendation],
  );

  const selectedIdList = React.useMemo(
    () => selectedRows.map((row) => row.id),
    [selectedRows],
  );

  const bulkComplete = React.useCallback(
    () => completeActions(selectedIdList),
    [completeActions, selectedIdList],
  );
  const bulkEscalate = React.useCallback(
    () => escalateActions(selectedIdList),
    [escalateActions, selectedIdList],
  );

  const generateReport = React.useCallback(() => {
    exportVisible();
    notify("Report generated from the current view.");
  }, [exportVisible, notify]);

  const focusQueue = React.useCallback(() => {
    document
      .getElementById("action-queue")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const caseContexts = React.useMemo(
    () => Object.values(data.contextByCaseNo),
    [data.contextByCaseNo],
  );

  const activeRow = api.activeRow;
  const drawerContext = activeRow ? (data.drawerByCaseNo[activeRow.caseNo] ?? null) : null;
  const drawerRecommendation = activeRow
    ? (data.recommendations.find((entry) => entry.caseNo === activeRow.caseNo) ?? null)
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        docKey="actions"
        title={t("page.actions.title")}
        description={t("page.actions.description")}
        meta={
          <>
            <MetaChip icon="Clock">{t("shell.dataAsAt", { when: formatTimestamp(DEMO_NOW, fmt) })}</MetaChip>
            <MetaChip icon="ListChecks">
              {api.allRows.filter((row) => row.isOpen).length} open of {api.allRows.length}
            </MetaChip>
            {api.dirtyCount > 0 ? (
              <MetaChip icon="PenLine">
                {api.dirtyCount} unsaved change{api.dirtyCount === 1 ? "" : "s"}
              </MetaChip>
            ) : null}
          </>
        }
        actions={
          <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
            <Icon name="Plus" size="sm" />
            {t("actionCenter.createAction")}
          </Button>
        }
      />

      <FirstUseTip screen="actions" />

      <ActionToolbar
        filters={api.filters}
        facets={api.facets}
        chips={api.chips}
        isFiltered={api.isFiltered}
        isRefreshing={api.isRefreshing}
        resultCount={api.rows.length}
        onSearch={api.setSearch}
        onToggle={api.toggleFilterValue}
        onClearField={api.clearFilterField}
        onRemoveChip={api.removeChip}
        onClearAll={api.clearFilters}
        onRefresh={api.refresh}
        onExport={api.exportVisible}
      />

      <div data-tour="action-kpi-band"><ActionKpiHeader kpis={api.kpis} onSelect={api.setScope} /></div>

      {api.notice ? (
        <ActionToast
          message={api.notice.message}
          tone={api.notice.tone}
          placement="floating"
          onDismiss={api.dismissNotice}
        />
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-10">
        {/* Left — the queue */}
        <div className="flex min-w-0 flex-col gap-3 xl:col-span-7">
          <BulkActionBar
            rows={selectedRows}
            onComplete={bulkComplete}
            onEscalate={bulkEscalate}
            onClear={api.clearSelection}
          >
            <AssignMenu
              users={data.assignableUsers}
              sessionUser={sessionUser}
              plantCodes={[...new Set(selectedRows.map((row) => row.plantCode))]}
              onAssign={(userId) => api.assignActions(selectedIdList, userId)}
              align="end"
            >
              <Button variant="secondary" size="sm">
                <Icon name="UserCog" size="sm" />
                {t("actionCenter.assign")}
              </Button>
            </AssignMenu>
          </BulkActionBar>

          <div id="action-queue" data-tour="action-queue" className="scroll-mt-20">
            <SectionCard
              title={t("actions.queue")}
              subtitle={t("actions.queueSub")}
              icon="Rows3"
              flush
              action={<QueueSummary rows={api.rows} />}
            >
              <ActionQueue
                rows={api.pageRows}
                totalCount={api.rows.length}
                selectedIds={api.selectedIds}
                sort={api.sort}
                page={api.page}
                pageCount={api.pageCount}
                users={data.assignableUsers}
                sessionUser={sessionUser}
                isFiltered={api.isFiltered}
                onToggleSort={api.toggleSort}
                onToggleRow={api.toggleRow}
                onToggleAll={api.toggleAllVisible}
                onOpen={api.openDrawer}
                onComplete={api.completeActions}
                onAssign={api.assignActions}
                onSetPage={api.setPage}
                onClearFilters={api.clearFilters}
              />
            </SectionCard>
          </div>
        </div>

        {/* Right — recommendations, deadlines, quick actions */}
        <aside className="flex min-w-0 flex-col gap-4 xl:col-span-3">
          <div data-tour="action-recommendations">
            <RecommendationsPanel
              recommendations={data.recommendations}
              appliedIds={appliedIds}
              onApply={applyAndRemember}
            />
          </div>
          <DeadlinesPanel groups={api.deadlines} onOpen={api.openDrawer} />
          <QuickActionsPanel
            selectedCount={selectedRows.length}
            onCreate={() => setCreateOpen(true)}
            onAssign={focusQueue}
            onEscalate={bulkEscalate}
            onClose={bulkComplete}
            onReport={generateReport}
          />
        </aside>
      </div>

      <ActionDrawer
        row={activeRow}
        context={drawerContext}
        recommendation={drawerRecommendation}
        users={data.assignableUsers}
        sessionUser={sessionUser}
        open={activeRow !== null}
        onClose={api.closeDrawer}
        onSetStatus={api.setActionStatus}
        onAssign={api.assignActions}
        onComplete={api.completeActions}
        onApplyRecommendation={applyAndRemember}
        recommendationApplied={
          drawerRecommendation ? appliedIds.has(drawerRecommendation.id) : false
        }
      />

      <CreateActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        cases={caseContexts}
        users={data.assignableUsers}
        sessionUser={sessionUser}
        onCreate={api.createAction}
      />
    </div>
  );
}


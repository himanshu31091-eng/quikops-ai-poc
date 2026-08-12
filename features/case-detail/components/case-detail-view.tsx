"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ActionToast } from "@/components/patterns/action-toast";
import type { CopilotSubject } from "@/components/copilot/types";
import { Skeleton } from "@/components/ui/skeleton";
import { COPILOT_PROMPTS } from "@/src/ai/prompts/catalogue";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import type { User } from "@/src/domain/types";
import { useCaseDetail } from "../hooks/use-case-detail";
import type { SessionOverlay } from "@/src/ai/types";
import type { CaseSection } from "../types";
import { AssignmentCard } from "./assignment-card";
import { AuditLogCard } from "./audit-log-card";
import { CaseHeader } from "./case-header";
import { CaseInformationCard } from "./case-information-card";
import { DataLineageCard } from "./data-lineage-card";
import { CaseSidePanel } from "./case-side-panel";
import { CommentsCard } from "./comments-card";
import { CorrectiveActionsCard } from "./corrective-actions-card";
import { EvidenceCard } from "./evidence-card";
import { ExecutionTimeline } from "./execution-timeline";
import { ExecutiveSummaryCard } from "./executive-summary-card";
import { VerificationCard } from "./verification-card";

/**
 * The Copilot is the only part of this page that pulls in a streaming client
 * and a markdown renderer, and most sessions never open it — so it is loaded on
 * first use rather than shipped with the case.
 */
const CopilotPanel = dynamic(
  () => import("@/components/copilot/copilot-panel").then((module) => module.CopilotPanel),
  {
    ssr: false,
    loading: () => (
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-3 border-l border-line bg-surface p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </aside>
    ),
  },
);

/** Toast jump targets, phrased as the thing the manager wants to look at. */
const SECTION_LABEL: Record<CaseSection, string> = {
  timeline: "View timeline",
  assignment: "View assignment",
  actions: "View plan",
  evidence: "View evidence",
  comments: "View discussion",
  verification: "View verification",
  audit: "View audit log",
};

interface CaseDetailViewProps {
  detail: CaseDetailModel;
  sessionUser: User;
}

/**
 * Module root. Owns composition and nothing else: the session state lives in
 * useCaseDetail, the presentation lives in the cards, and this file is the
 * wiring plus the two-column layout.
 */
export function CaseDetailView({ detail, sessionUser }: CaseDetailViewProps) {
  const api = useCaseDetail(detail, sessionUser);
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [copilotMounted, setCopilotMounted] = React.useState(false);
  const dropZoneRef = React.useRef<HTMLDivElement | null>(null);

  const openCopilot = React.useCallback(() => {
    setCopilotMounted(true);
    setCopilotOpen(true);
  }, []);
  const closeCopilot = React.useCallback(() => setCopilotOpen(false), []);

  const focusEvidence = React.useCallback(() => {
    const node = dropZoneRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.focus({ preventScroll: true });
  }, []);

  /** Pulls the eye to the section a change landed in. */
  const scrollToSection = React.useCallback((section: CaseSection) => {
    document
      .getElementById(`case-section-${section}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Depend on the individual callbacks — they are stable across renders — rather
  // than on `api`, which is a fresh object every render and would make every
  // memoised section re-render on every keystroke elsewhere on the page.
  const { requestVerification: submitForVerification, addComment } = api;

  const requestVerification = React.useCallback(() => {
    submitForVerification();
    scrollToSection("verification");
  }, [submitForVerification, scrollToSection]);

  const addAssignmentNote = React.useCallback(
    (body: string) => addComment(body, null, []),
    [addComment],
  );

  const session = api.session;
  const terminal = session.status === "VERIFIED" || session.status === "CLOSED";

  /**
   * What the Copilot needs to know about work done since the page loaded. A ref
   * rather than a prop so editing the case does not re-render the panel; it is
   * read at the moment a question is asked.
   */
  const overlayRef = React.useRef<SessionOverlay | null>(null);
  overlayRef.current = {
    status: session.status,
    ownerId: session.ownerId,
    reviewerId: session.reviewerId,
    priorityBand: session.priorityBand,
    actionsTotal: session.actions.length,
    actionsDone: session.actions.filter((action) => action.status === "DONE").length,
    evidenceCount: session.evidence.length,
    verificationDecision: session.verification?.decision ?? null,
  };

  /** How the shared Copilot panel introduces itself for this case. */
  const copilotSubject = React.useMemo<CopilotSubject>(
    () => ({
      scope: "case",
      caseNo: detail.case.caseNo,
      ref: detail.case.caseNo,
      scopeNote: "Answers from this case record only",
      offlineSource: "the case record",
      inputLabel: "Ask the Copilot about this case",
      placeholder:
        "Ask about the root cause, the plan, the impact, or what to do next.",
      suggestions: COPILOT_PROMPTS,
      intro: (
        <>
          I have the full record for{" "}
          <span className="font-medium text-content">{detail.case.caseNo}</span> — the case,
          its {detail.actions.length} corrective action
          {detail.actions.length === 1 ? "" : "s"}, {detail.evidence.length} evidence file
          {detail.evidence.length === 1 ? "" : "s"}, the discussion, the timeline and the
          verification state. Ask about any of it.
        </>
      ),
    }),
    [detail.case.caseNo, detail.actions.length, detail.evidence.length],
  );

  return (
    <div className="space-y-4">
<div data-tour="case-header">
      <CaseHeader
        detail={detail}
        session={session}
        owner={api.owner}
        reviewer={api.reviewer}
        onAssign={api.assignOwner}
        onStartWork={api.startWork}
        onUploadEvidence={focusEvidence}
        onRequestVerification={requestVerification}
        onExport={api.exportRecord}
        onOpenCopilot={openCopilot}
        pending={api.pending}
      />
      </div>

      {api.notice ? (
        <ActionToast
          message={api.notice.message}
          tone={api.notice.tone}
          placement="floating"
          onDismiss={api.dismissNotice}
          {...(api.notice.section
            ? {
                actionLabel: SECTION_LABEL[api.notice.section],
                onAction: () => scrollToSection(api.notice!.section!),
              }
            : {})}
        />
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <ExecutiveSummaryCard detail={detail} />

          {/* Additive: where the case came from, before what was done about it. */}
          <div id="case-section-lineage" className="scroll-mt-20">
            <DataLineageCard
              item={detail.case}
              detectionRule={`${detail.information.detectionRuleId} · ${detail.information.detectionRuleName}`}
              signalRef={detail.information.signalRef}
              ownerName={api.owner?.name ?? "Unassigned"}
            />
          </div>

          <div id="case-section-timeline" className="scroll-mt-20">
            <ExecutionTimeline events={session.timeline} recentIds={api.recentIds} />
          </div>

          <CaseInformationCard detail={detail} />

          <div id="case-section-assignment" className="scroll-mt-20">
            <AssignmentCard
              session={session}
              owner={api.owner}
              reviewer={api.reviewer}
              users={detail.assignableUsers}
              scoredBand={detail.case.priorityBand}
              onAssignOwner={api.assignOwner}
              onSetReviewer={api.setReviewer}
              onSetDueAt={api.setDueAt}
              onSetPriority={api.setPriority}
              onSetStatus={api.setStatus}
              onAddNote={addAssignmentNote}
            />
          </div>

          <div id="case-section-actions" className="scroll-mt-20">
            <div data-tour="case-actions">
            <CorrectiveActionsCard
              actions={session.actions}
              users={detail.assignableUsers}
              defaultOwnerId={session.ownerId ?? detail.assignableUsers[0]?.id ?? sessionUser.id}
              defaultDueAt={session.dueAt}
              readOnly={terminal}
              recentIds={api.recentIds}
              onAdd={api.addAction}
              onSetProgress={api.setActionProgress}
              onSetStatus={api.setActionStatus}
              onSetNotes={api.setActionNotes}
              onEdit={api.editAction}
              onReorder={api.reorderAction}
              onRemove={api.removeAction}
            />
            </div>
          </div>

          <div id="case-section-evidence" className="scroll-mt-20">
            <div data-tour="case-evidence">
            <EvidenceCard
              evidence={session.evidence}
              actions={session.actions}
              readOnly={terminal}
              recentIds={api.recentIds}
              onAdd={api.addEvidence}
              onRemove={api.removeEvidence}
              dropZoneRef={dropZoneRef}
            />
            </div>
          </div>

          <div id="case-section-comments" className="scroll-mt-20">
            <CommentsCard
              comments={session.comments}
              users={detail.assignableUsers}
              sessionUser={sessionUser}
              recentIds={api.recentIds}
              onAdd={api.addComment}
            />
          </div>

          <div id="case-section-verification" className="scroll-mt-20">
            <div data-tour="case-verification">
            <VerificationCard
              session={session}
              reviewer={api.reviewer}
              sessionUser={sessionUser}
              actions={session.actions}
              evidenceCount={session.evidence.length}
              pending={api.pending}
              onRequest={api.requestVerification}
              onDecide={api.decideVerification}
            />
            </div>
          </div>

          <div id="case-section-audit" className="scroll-mt-20">
            <div data-tour="case-audit">
            <AuditLogCard entries={session.audit} recentIds={api.recentIds} />
            </div>
          </div>
        </div>

        <aside className="min-w-0 xl:col-span-4">
          <CaseSidePanel
            detail={detail}
            session={session}
            health={api.health}
            onOpenCopilot={openCopilot}
            onUploadEvidence={focusEvidence}
            onRequestVerification={requestVerification}
            onExport={api.exportRecord}
            className="lg:grid-cols-2 xl:sticky xl:top-[calc(var(--spacing-topbar)+1rem)] xl:grid-cols-1"
          />
        </aside>
      </div>

      {copilotMounted ? (
        <CopilotPanel
          subject={copilotSubject}
          sessionUser={sessionUser}
          open={copilotOpen}
          onClose={closeCopilot}
          overlayRef={overlayRef}
        />
      ) : null}
    </div>
  );
}

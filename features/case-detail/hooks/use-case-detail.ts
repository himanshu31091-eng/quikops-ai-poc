"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { CASE_STATUS_META, PRIORITY_META } from "@/src/config/app-config";
import {
  addActionAction,
  addCommentAction,
  addEvidenceAction,
  assignOwnerAction,
  decideVerificationAction,
  removeActionAction,
  removeEvidenceAction,
  reorderActionAction,
  requestVerificationAction,
  setDueAtAction,
  setPriorityAction,
  setReviewerAction,
  setStatusAction,
  startWorkAction,
  updateActionAction,
} from "@/src/data/mutations/case-mutations";
import type { MutationResult } from "@/src/data/mutations/result";
import type { CaseDetailModel } from "@/src/data/queries/case-detail";
import { scoreCaseHealth } from "@/src/domain/case-health";
import { verifiedKpiValue } from "@/src/domain/kpi-outcome";
import type {
  ActionStatus,
  CaseHealth,
  CaseAuditEntry,
  CaseCommentAttachment,
  CaseStatus,
  CaseTimelineEvent,
  CorrectiveAction,
  KpiKey,
  PriorityBand,
  User,
} from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { useExecutionStore } from "@/src/workflow/execution-store";
import { formatMoney, formatTimestamp } from "@/src/lib/format";
import type { WorkflowEventKind } from "@/src/workflow/types";
import type {
  CaseSection,
  CaseSessionState,
  EvidenceDraft,
  NewActionDraft,
  PendingCommand,
  VerificationDraft,
} from "../types";
import { exportCase } from "../utils/case-export";

/**
 * The single owner of everything mutable on a case.
 *
 * Two rules hold for every action below, because they are what make the page
 * trustworthy rather than merely interactive:
 *
 *   1. No state change happens without a timeline event and an audit entry.
 *      A status that moved with no record of who moved it is exactly the
 *      failure mode an execution platform exists to prevent.
 *   2. Status is derived from work, never typed in. Assigning an owner moves a
 *      detected case to assigned; completing every action does not silently
 *      verify anything — a reviewer still has to decide.
 *
 * Changes live in this session only. Refresh re-reads the stored record.
 */

interface ReducerContext {
  caseId: string;
  caseNo: string;
  userById: Record<string, User>;
  kpiKey: KpiKey;
  measurementWindowDays: number;
  baselineValue: number;
  targetValue: number;
  priorityBand: PriorityBand;
  plantCode: string;
}

export type SessionAction =
  | { type: "ASSIGN_OWNER"; ownerId: string | null; actor: User }
  | { type: "SET_REVIEWER"; reviewerId: string; actor: User }
  | { type: "SET_DUE_AT"; dueAt: string; actor: User }
  | { type: "SET_PRIORITY"; band: PriorityBand; actor: User }
  | { type: "SET_STATUS"; status: CaseStatus; actor: User }
  | { type: "START_WORK"; actor: User }
  | { type: "ADD_ACTION"; draft: NewActionDraft; actor: User }
  | {
      type: "UPDATE_ACTION";
      id: string;
      patch: Partial<
        Pick<
          CorrectiveAction,
          "title" | "description" | "ownerId" | "dueAt" | "notes" | "completionPct" | "status"
        >
      >;
      actor: User;
    }
  | { type: "REMOVE_ACTION"; id: string; actor: User }
  | { type: "REORDER_ACTION"; id: string; direction: -1 | 1; actor: User }
  | { type: "ADD_EVIDENCE"; drafts: EvidenceDraft[]; actor: User }
  | { type: "REMOVE_EVIDENCE"; id: string; actor: User }
  | {
      type: "ADD_COMMENT";
      body: string;
      parentId: string | null;
      attachments: CaseCommentAttachment[];
      mentions: string[];
      actor: User;
    }
  | { type: "REQUEST_VERIFICATION"; actor: User }
  | { type: "DECIDE_VERIFICATION"; draft: VerificationDraft; actor: User };

/** Timestamp written onto published outcomes. */
const NOW_ISO = DEMO_NOW.toISOString();

/** How long a headline command spends settling before it commits. */
const SETTLE_MS = 420;

/** How long a changed row stays highlighted after it lands. */
const HIGHLIGHT_MS = 4_000;

export interface CaseNotice {
  id: number;
  message: string;
  tone: "success" | "info";
  /** Section the change landed in, so the toast can offer to jump to it. */
  section: CaseSection | null;
}

/** Session events are stamped a second apart so ordering is never ambiguous. */
const stampFor = (seq: number): string =>
  new Date(DEMO_NOW.getTime() + seq * 1000).toISOString();

function statusFromCompletion(pct: number): ActionStatus {
  if (pct >= 100) return "DONE";
  if (pct > 0) return "IN_PROGRESS";
  return "TODO";
}

interface RecordInput {
  kind: CaseTimelineEvent["kind"];
  actor: User | null;
  title: string;
  detail: string;
  facts?: { label: string; value: string }[];
  /** The record this change created or edited, so its row can be highlighted. */
  targetId?: string | null;
  /** Where to pull the manager's eye once the change lands. */
  section?: CaseSection | null;
  audit: {
    action: string;
    field?: string | null;
    fromValue?: string | null;
    toValue?: string | null;
  };
}

/** Appends the timeline event and the audit row for one change, together. */
function record(state: CaseSessionState, input: RecordInput): CaseSessionState {
  const seq = state.seq + 1;
  const at = stampFor(seq);

  const event: CaseTimelineEvent = {
    id: `tl_session_${seq}`,
    kind: input.kind,
    at,
    actorId: input.actor?.id ?? null,
    actorName: input.actor?.name ?? "QuikOps",
    actorRole: input.actor?.role ?? null,
    title: input.title,
    detail: input.detail,
    facts: input.facts ?? [],
  };

  const audit: CaseAuditEntry = {
    id: `aud_session_${seq}`,
    at,
    actorId: input.actor?.id ?? null,
    actorName: input.actor?.name ?? "QuikOps",
    actorRole: input.actor?.role ?? null,
    action: input.audit.action,
    field: input.audit.field ?? null,
    fromValue: input.audit.fromValue ?? null,
    toValue: input.audit.toValue ?? null,
    source: "CASE_DETAIL",
  };

  return {
    ...state,
    seq,
    changeCount: state.changeCount + 1,
    timeline: [...state.timeline, event],
    audit: [audit, ...state.audit],
    lastChange: {
      seq,
      timelineId: event.id,
      auditId: audit.id,
      targetId: input.targetId ?? null,
      section: input.section ?? null,
    },
  };
}

function createReducer(ctx: ReducerContext) {
  return function reducer(state: CaseSessionState, action: SessionAction): CaseSessionState {
    switch (action.type) {
      case "ASSIGN_OWNER": {
        const previous = state.ownerId ? ctx.userById[state.ownerId]?.name : null;
        const next = action.ownerId ? ctx.userById[action.ownerId] : null;
        // A detected case that gains an owner is, by definition, assigned.
        const status: CaseStatus =
          action.ownerId !== null &&
          (state.status === "NEW" || state.status === "TRIAGED" || state.status === "REOPENED")
            ? "ASSIGNED"
            : state.status;

        return record({ ...state, ownerId: action.ownerId, status }, {
          kind: "ASSIGNED",
          actor: action.actor,
          title: next ? `Assigned to ${next.name}` : "Owner removed",
          section: "assignment",
          detail: next
            ? `${next.name} (${next.jobTitle}) is accountable for closing this case.`
            : "The case has no owner and will return to the triage queue.",
          facts: next ? [{ label: "Plant scope", value: next.plantScope.join(", ") }] : [],
          audit: {
            action: next ? "Owner assigned" : "Owner cleared",
            field: "ownerId",
            fromValue: previous ?? "Unassigned",
            toValue: next?.name ?? "Unassigned",
          },
        });
      }

      case "SET_REVIEWER": {
        const previous = ctx.userById[state.reviewerId]?.name ?? state.reviewerId;
        const next = ctx.userById[action.reviewerId];
        return record({ ...state, reviewerId: action.reviewerId }, {
          kind: "OWNER_CHANGED",
          actor: action.actor,
          title: `Reviewer set to ${next?.name ?? action.reviewerId}`,
          section: "assignment",
          detail: "Verification will be routed to this reviewer when the work is submitted.",
          audit: {
            action: "Reviewer changed",
            field: "reviewerId",
            fromValue: previous,
            toValue: next?.name ?? action.reviewerId,
          },
        });
      }

      case "SET_DUE_AT": {
        const previous = state.dueAt;
        return record({ ...state, dueAt: action.dueAt }, {
          kind: "DUE_DATE_CHANGED",
          actor: action.actor,
          title: "Due date changed",
          section: "assignment",
          detail: `Resolution target moved to ${formatTimestamp(action.dueAt)}. The SLA clock follows the new date.`,
          facts: [{ label: "Previous", value: formatTimestamp(previous) }],
          audit: {
            action: "Due date changed",
            field: "dueAt",
            fromValue: previous,
            toValue: action.dueAt,
          },
        });
      }

      case "SET_PRIORITY": {
        const previous = state.priorityBand;
        if (previous === action.band) return state;
        return record({ ...state, priorityBand: action.band }, {
          kind: "PRIORITY_CHANGED",
          actor: action.actor,
          title: `Priority overridden to ${PRIORITY_META[action.band].label}`,
          section: "assignment",
          detail:
            "Manual override of the scored band. The computed score is unchanged and remains visible for audit.",
          facts: [{ label: "Scored band", value: PRIORITY_META[ctx.priorityBand].label }],
          audit: {
            action: "Priority overridden",
            field: "priorityBand",
            fromValue: PRIORITY_META[previous].label,
            toValue: PRIORITY_META[action.band].label,
          },
        });
      }

      case "SET_STATUS": {
        const previous = state.status;
        if (previous === action.status) return state;
        return record({ ...state, status: action.status }, {
          kind: "STATUS_CHANGED",
          actor: action.actor,
          title: `Status changed to ${CASE_STATUS_META[action.status].label}`,
          section: "assignment",
          detail: `Moved from ${CASE_STATUS_META[previous].label.toLowerCase()} to ${CASE_STATUS_META[
            action.status
          ].label.toLowerCase()}.`,
          audit: {
            action: "Status changed",
            field: "status",
            fromValue: CASE_STATUS_META[previous].label,
            toValue: CASE_STATUS_META[action.status].label,
          },
        });
      }

      case "START_WORK": {
        if (state.status === "IN_PROGRESS") return state;
        const previous = state.status;
        return record({ ...state, status: "IN_PROGRESS" }, {
          kind: "WORK_STARTED",
          actor: action.actor,
          title: "Work started",
          section: "timeline",
          detail: "The case moved to in progress and the corrective action plan is now live.",
          facts: [{ label: "Open actions", value: `${state.actions.filter((a) => a.status !== "DONE").length}` }],
          audit: {
            action: "Work started",
            field: "status",
            fromValue: CASE_STATUS_META[previous].label,
            toValue: CASE_STATUS_META.IN_PROGRESS.label,
          },
        });
      }

      case "ADD_ACTION": {
        const seq = state.seq + 1;
        const created: CorrectiveAction = {
          id: `actn_session_${seq}`,
          caseId: ctx.caseId,
          caseNo: ctx.caseNo,
          caseTitle: "",
          title: action.draft.title.trim(),
          description: action.draft.description.trim(),
          ownerId: action.draft.ownerId,
          status: "TODO",
          origin: "MANUAL",
          dueAt: action.draft.dueAt,
          completedAt: null,
          priorityBand: state.priorityBand,
          plantCode: ctx.plantCode,
          completionPct: 0,
          notes: "Not started.",
          evidenceCount: 0,
        };

        return record({ ...state, seq, actions: [...state.actions, created] }, {
          kind: "ACTION_ADDED",
          actor: action.actor,
          title: `Action added — ${created.title}`,
          section: "actions",
          targetId: created.id,
          detail: created.description || "No description recorded.",
          facts: [
            {
              label: "Owner",
              value: ctx.userById[created.ownerId]?.name ?? created.ownerId,
            },
            { label: "Due", value: formatTimestamp(created.dueAt) },
          ],
          audit: {
            action: "Corrective action created",
            field: "actions",
            fromValue: `${state.actions.length}`,
            toValue: `${state.actions.length + 1}`,
          },
        });
      }

      case "UPDATE_ACTION": {
        const existing = state.actions.find((entry) => entry.id === action.id);
        if (!existing) return state;

        const completionPct = action.patch.completionPct ?? existing.completionPct;
        const status =
          action.patch.status ??
          (action.patch.completionPct !== undefined
            ? statusFromCompletion(completionPct)
            : existing.status);
        const completedAt =
          status === "DONE"
            ? (existing.completedAt ?? stampFor(state.seq + 1))
            : null;

        const updated: CorrectiveAction = {
          ...existing,
          ...action.patch,
          completionPct: status === "DONE" ? 100 : completionPct,
          status,
          completedAt,
        };

        const next = {
          ...state,
          actions: state.actions.map((entry) => (entry.id === action.id ? updated : entry)),
        };

        const completedNow = status === "DONE" && existing.status !== "DONE";
        return record(next, {
          kind: completedNow ? "ACTION_COMPLETED" : "ACTION_ADDED",
          actor: action.actor,
          title: completedNow
            ? `Action completed — ${updated.title}`
            : `Action updated — ${updated.title}`,
          section: "actions",
          targetId: updated.id,
          detail: completedNow
            ? updated.notes || "Marked complete by the owner."
            : `Progress reported at ${updated.completionPct}%. ${updated.notes}`,
          facts: [{ label: "Progress", value: `${updated.completionPct}%` }],
          audit: {
            action: completedNow ? "Corrective action completed" : "Corrective action updated",
            field: `actions.${existing.id}`,
            fromValue: `${existing.status} · ${existing.completionPct}%`,
            toValue: `${updated.status} · ${updated.completionPct}%`,
          },
        });
      }

      case "REMOVE_ACTION": {
        const existing = state.actions.find((entry) => entry.id === action.id);
        if (!existing) return state;
        return record(
          { ...state, actions: state.actions.filter((entry) => entry.id !== action.id) },
          {
            kind: "ACTION_ADDED",
            actor: action.actor,
            title: `Action removed — ${existing.title}`,
            section: "actions",
            detail: "Removed from the corrective plan. Evidence filed against it is retained.",
            audit: {
              action: "Corrective action removed",
              field: "actions",
              fromValue: existing.title,
              toValue: "Removed",
            },
          },
        );
      }

      case "REORDER_ACTION": {
        const index = state.actions.findIndex((entry) => entry.id === action.id);
        const target = index + action.direction;
        if (index === -1 || target < 0 || target >= state.actions.length) return state;

        const actions = [...state.actions];
        const [moved] = actions.splice(index, 1);
        actions.splice(target, 0, moved!);

        return record({ ...state, actions }, {
          kind: "ACTION_ADDED",
          actor: action.actor,
          title: `Plan reordered — ${moved!.title}`,
          section: "actions",
          targetId: moved!.id,
          detail: `Moved to position ${target + 1} of ${actions.length}. Sequence is the order the owner works the plan.`,
          audit: {
            action: "Corrective action reordered",
            field: `actions.${moved!.id}.position`,
            fromValue: `${index + 1}`,
            toValue: `${target + 1}`,
          },
        });
      }

      case "ADD_EVIDENCE": {
        if (action.drafts.length === 0) return state;
        let seq = state.seq;
        const added = action.drafts.map((draft) => {
          seq += 1;
          return {
            id: `evd_session_${seq}`,
            caseId: ctx.caseId,
            fileName: draft.fileName,
            kind: draft.kind,
            sizeBytes: draft.sizeBytes,
            uploadedById: action.actor.id,
            uploadedByName: action.actor.name,
            uploadedAt: stampFor(seq),
            description: draft.description,
            actionId: draft.actionId,
            accepted: false,
            ...(draft.objectUrl ? { objectUrl: draft.objectUrl } : {}),
          };
        });

        const linked = new Set(
          added.map((file) => file.actionId).filter((id): id is string => id !== null),
        );

        return record(
          {
            ...state,
            seq,
            evidence: [...state.evidence, ...added],
            actions: state.actions.map((entry) =>
              linked.has(entry.id)
                ? { ...entry, evidenceCount: entry.evidenceCount + 1 }
                : entry,
            ),
          },
          {
            kind: "EVIDENCE_UPLOADED",
            actor: action.actor,
            title:
              added.length === 1
                ? "Evidence uploaded"
                : `${added.length} evidence files uploaded`,
            section: "evidence",
            targetId: added[0]?.id ?? null,
            detail: added.map((file) => file.fileName).join(", "),
            facts: [{ label: "Files", value: `${added.length}` }],
            audit: {
              action: "Evidence uploaded",
              field: "evidence",
              fromValue: `${state.evidence.length}`,
              toValue: `${state.evidence.length + added.length}`,
            },
          },
        );
      }

      case "REMOVE_EVIDENCE": {
        const existing = state.evidence.find((entry) => entry.id === action.id);
        if (!existing) return state;
        if (existing.objectUrl) URL.revokeObjectURL(existing.objectUrl);
        return record(
          {
            ...state,
            evidence: state.evidence.filter((entry) => entry.id !== action.id),
            actions: state.actions.map((entry) =>
              entry.id === existing.actionId
                ? { ...entry, evidenceCount: Math.max(0, entry.evidenceCount - 1) }
                : entry,
            ),
          },
          {
            kind: "EVIDENCE_UPLOADED",
            actor: action.actor,
            title: "Evidence removed",
            section: "evidence",
            detail: `${existing.fileName} was removed from the case.`,
            audit: {
              action: "Evidence removed",
              field: "evidence",
              fromValue: existing.fileName,
              toValue: "Removed",
            },
          },
        );
      }

      case "ADD_COMMENT": {
        const seq = state.seq + 1;
        const comment = {
          id: `cmt_session_${seq}`,
          caseId: ctx.caseId,
          parentId: action.parentId,
          authorId: action.actor.id,
          authorName: action.actor.name,
          authorRole: action.actor.role,
          body: action.body.trim(),
          at: stampFor(seq),
          mentions: action.mentions,
          attachments: action.attachments,
        };

        return record({ ...state, seq, comments: [...state.comments, comment] }, {
          kind: "COMMENT_ADDED",
          actor: action.actor,
          title: action.parentId ? "Reply added" : "Comment added",
          section: "comments",
          targetId: comment.id,
          detail:
            comment.body.length > 160 ? `${comment.body.slice(0, 157)}…` : comment.body,
          facts:
            action.mentions.length > 0
              ? [
                  {
                    label: "Notified",
                    value: action.mentions
                      .map((id) => ctx.userById[id]?.name ?? id)
                      .join(", "),
                  },
                ]
              : [],
          audit: {
            action: action.parentId ? "Reply added" : "Comment added",
            field: "comments",
            fromValue: `${state.comments.length}`,
            toValue: `${state.comments.length + 1}`,
          },
        });
      }

      case "REQUEST_VERIFICATION": {
        const seq = state.seq + 1;
        const reviewer = ctx.userById[state.reviewerId];
        const done = state.actions.filter((entry) => entry.status === "DONE").length;

        return record(
          {
            ...state,
            seq,
            status: "PENDING_VERIFY",
            verification: {
              id: state.verification?.id ?? `ver_session_${seq}`,
              caseId: ctx.caseId,
              requestedById: action.actor.id,
              requestedByName: action.actor.name,
              requestedAt: stampFor(seq),
              reviewerId: state.reviewerId,
              reviewerName: reviewer?.name ?? state.reviewerId,
              decision: null,
              decidedAt: null,
              comment: "",
              notes: `Submitted with ${done} of ${state.actions.length} actions complete and ${state.evidence.length} evidence files attached.`,
              kpiKey: state.verification?.kpiKey ?? ctx.kpiKey,
              kpiBaseline: ctx.baselineValue,
              kpiCurrent: null,
              kpiTarget: ctx.targetValue,
              measurementWindowDays: ctx.measurementWindowDays,
            },
          },
          {
            kind: "VERIFICATION_REQUESTED",
            actor: action.actor,
            title: "Verification requested",
            section: "verification",
            detail: `Submitted to ${reviewer?.name ?? "the reviewer"} for sign-off against the ${
              ctx.measurementWindowDays
            }-day measurement window.`,
            facts: [
              { label: "Reviewer", value: reviewer?.name ?? state.reviewerId },
              { label: "Evidence", value: `${state.evidence.length} files` },
            ],
            audit: {
              action: "Verification requested",
              field: "status",
              fromValue: CASE_STATUS_META[state.status].label,
              toValue: CASE_STATUS_META.PENDING_VERIFY.label,
            },
          },
        );
      }

      case "DECIDE_VERIFICATION": {
        if (!state.verification) return state;
        const seq = state.seq + 1;
        const { decision, comment, notes } = action.draft;
        const nextStatus: CaseStatus = decision === "APPROVED" ? "VERIFIED" : "IN_PROGRESS";

        const kpiCurrent =
          decision === "APPROVED" ? verifiedKpiValue(ctx.baselineValue, ctx.targetValue) : null;

        return record(
          {
            ...state,
            seq,
            status: nextStatus,
            verification: {
              ...state.verification,
              decision,
              decidedAt: stampFor(seq),
              comment,
              notes,
              kpiCurrent,
            },
            evidence:
              decision === "APPROVED"
                ? state.evidence.map((file) => ({ ...file, accepted: true }))
                : state.evidence,
          },
          {
            kind:
              decision === "APPROVED" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
            actor: action.actor,
            title:
              decision === "APPROVED"
                ? "Verification approved"
                : decision === "REJECTED"
                  ? "Verification rejected"
                  : "Sent back to the owner",
            section: "verification",
            detail: comment,
            facts: [
              { label: "Reviewer", value: action.actor.name },
              ...(kpiCurrent !== null
                ? [{ label: "KPI", value: `${ctx.baselineValue} → ${kpiCurrent}` }]
                : []),
            ],
            audit: {
              action: `Verification ${decision.replace("_", " ").toLowerCase()}`,
              field: "verification.decision",
              fromValue: "PENDING",
              toValue: decision,
            },
          },
        );
      }
    }
  };
}

function initialState(detail: CaseDetailModel): CaseSessionState {
  return {
    status: detail.case.status,
    ownerId: detail.case.ownerId,
    reviewerId: detail.reviewer.id,
    dueAt: detail.case.dueAt,
    priorityBand: detail.case.priorityBand,
    actions: detail.actions,
    evidence: detail.evidence,
    comments: detail.comments,
    verification: detail.verification,
    timeline: detail.timeline,
    audit: detail.audit,
    seq: 0,
    changeCount: 0,
    lastChange: null,
  };
}

export interface CaseDetailApi {
  session: CaseSessionState;
  owner: User | null;
  reviewer: User;
  /** Actor behind every session change — the signed-in persona. */
  actor: User;
  /** Re-scored on every change, so the dial moves as the work moves. */
  health: CaseHealth;
  notice: CaseNotice | null;
  dismissNotice: () => void;
  /** The command currently settling, for button-level feedback. */
  pending: PendingCommand;
  /**
   * Ids touched by the last change — timeline event, audit row and the record
   * itself. Sections use this to flash the row that just landed.
   */
  recentIds: Set<string>;

  assignOwner: (ownerId: string | null) => void;
  setReviewer: (reviewerId: string) => void;
  setDueAt: (dueAt: string) => void;
  setPriority: (band: PriorityBand) => void;
  setStatus: (status: CaseStatus) => void;
  startWork: () => void;

  addAction: (draft: NewActionDraft) => void;
  setActionProgress: (id: string, completionPct: number) => void;
  setActionStatus: (id: string, status: ActionStatus) => void;
  setActionNotes: (id: string, notes: string) => void;
  editAction: (
    id: string,
    patch: { title?: string; description?: string; ownerId?: string; dueAt?: string },
  ) => void;
  reorderAction: (id: string, direction: -1 | 1) => void;
  removeAction: (id: string) => void;

  addEvidence: (drafts: EvidenceDraft[]) => void;
  removeEvidence: (id: string) => void;

  addComment: (
    body: string,
    parentId: string | null,
    attachments: CaseCommentAttachment[],
  ) => void;

  requestVerification: () => void;
  decideVerification: (draft: VerificationDraft) => void;

  exportRecord: () => void;
}

export function useCaseDetail(
  detail: CaseDetailModel,
  sessionUser: User,
  /**
   * Whether changes are written to the database.
   *
   * Decided on the server and passed down, because `USE_DATABASE` is a
   * server-side value and a client bundle must never be able to read it. False
   * keeps the fixture behaviour exactly as it was: everything below still
   * dispatches to the reducer, and nothing is sent anywhere.
   */
  persistent = false,
): CaseDetailApi {
  const ctx = React.useMemo<ReducerContext>(
    () => ({
      caseId: detail.case.id,
      caseNo: detail.case.caseNo,
      userById: Object.fromEntries(
        [...detail.assignableUsers, detail.reviewer, sessionUser].map((user) => [user.id, user]),
      ),
      kpiKey: detail.case.kpiKey,
      measurementWindowDays: detail.case.measurementWindowDays,
      baselineValue: detail.case.baselineValue,
      targetValue: detail.case.targetValue,
      priorityBand: detail.case.priorityBand,
      plantCode: detail.case.plantCode,
    }),
    [detail, sessionUser],
  );

  const reducer = React.useMemo(() => createReducer(ctx), [ctx]);
  const [session, dispatch] = React.useReducer(reducer, detail, initialState);
  const [notice, setNotice] = React.useState<CaseNotice | null>(null);
  const [pending, setPending] = React.useState<PendingCommand>(null);
  const noticeSeq = React.useRef(0);
  const timersRef = React.useRef<number[]>([]);

  const say = React.useCallback(
    (message: string, tone: CaseNotice["tone"] = "success", section: CaseSection | null = null) => {
      noticeSeq.current += 1;
      setNotice({ id: noticeSeq.current, message, tone, section });
    },
    [],
  );

  React.useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * Every headline command settles rather than snapping. The delay is short
   * enough to stay responsive and long enough that the button state, the
   * status badge and the new timeline row read as one connected event instead
   * of the page redrawing under the cursor.
   */
  const settle = React.useCallback(
    (command: Exclude<PendingCommand, null>, commit: () => void) => {
      setPending(command);
      const timer = window.setTimeout(() => {
        commit();
        setPending((current) => (current === command ? null : current));
      }, SETTLE_MS);
      timersRef.current.push(timer);
    },
    [],
  );

  React.useEffect(
    () => () => {
      for (const timer of timersRef.current) window.clearTimeout(timer);
      timersRef.current = [];
    },
    [],
  );

  /**
   * Publishing to the shared store is what makes the workflow end-to-end: the
   * case page stays the source of truth for its own actions, evidence and
   * comments, and pushes only the outcome — status, owner, recovered revenue —
   * to the layer the queue and the dashboard read.
   */
  const { recordOutcome } = useExecutionStore();
  const caseNo = detail.case.caseNo;

  const publish = React.useCallback(
    (
      patch: Parameters<typeof recordOutcome>[0]["patch"],
      event?: { kind: WorkflowEventKind; summary: string },
    ) => {
      recordOutcome({
        caseNo,
        patch,
        ...(event ? { event: { ...event, actor: sessionUser } } : {}),
      });
    },
    [recordOutcome, caseNo, sessionUser],
  );

  // Latest-value ref: keeps the callbacks below stable so memoised sections do
  // not re-render every time an unrelated part of the case changes.
  const sessionRef = React.useRef(session);
  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Object URLs behind in-session image previews are released with the page.
  React.useEffect(
    () => () => {
      for (const file of sessionRef.current.evidence) {
        if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);
      }
    },
    [],
  );

  const dismissNotice = React.useCallback(() => setNotice(null), []);

  /**
   * Sends a change to the server and re-reads the record.
   *
   * The reducer above has already applied the change optimistically, which is
   * what keeps the page immediate. This is what makes it true: the write goes
   * to the database, and `router.refresh()` pulls the stored record back.
   * Fresh server data remounts this hook (see the `key` in the page), so
   * whatever the database actually holds replaces the optimistic copy.
   *
   * **A failed write is never swallowed.** The message is shown and the record
   * is re-read anyway, which discards the optimistic change rather than
   * leaving something on screen that was never saved. Silently keeping it is
   * how a client comes back tomorrow to find their work gone.
   */
  const router = useRouter();
  const persist = React.useCallback(
    (run: () => Promise<MutationResult>) => {
      if (!persistent) return;
      void (async () => {
        let result: MutationResult;
        try {
          result = await run();
        } catch {
          result = { ok: false, error: "the server did not respond." };
        }
        if (!result.ok) say(`Not saved — ${result.error}`, "info");
        router.refresh();
      })();
    },
    [persistent, router, say],
  );

  const assignOwner = React.useCallback(
    (ownerId: string | null) => {
      settle("assign", () => {
        dispatch({ type: "ASSIGN_OWNER", ownerId, actor: sessionUser });
        const previousStatus = sessionRef.current.status;
        publish(
          {
            ownerId,
            assignedAt: ownerId ? NOW_ISO : null,
            ...(ownerId &&
            (previousStatus === "NEW" ||
              previousStatus === "TRIAGED" ||
              previousStatus === "REOPENED")
              ? { status: "ASSIGNED" as const }
              : {}),
          },
          ownerId
            ? {
                kind: "ASSIGNED",
                summary: `Assigned to ${ctx.userById[ownerId]?.name ?? "an owner"} — ${detail.case.title}`,
              }
            : undefined,
        );
        say(
          ownerId
            ? `Assigned to ${ctx.userById[ownerId]?.name ?? "the selected owner"} — the case moved to assigned.`
            : "Owner cleared. The case returns to the triage queue.",
          ownerId ? "success" : "info",
          "assignment",
        );
        persist(() => assignOwnerAction(caseNo, ownerId));
      });
    },
    [ctx.userById, sessionUser, say, settle, publish, persist, caseNo, detail.case.title],
  );

  const setReviewer = React.useCallback(
    (reviewerId: string) => {
      dispatch({ type: "SET_REVIEWER", reviewerId, actor: sessionUser });
      publish(
        { reviewerId },
        {
          kind: "ASSIGNED",
          summary: `${ctx.userById[reviewerId]?.name ?? "A reviewer"} named as reviewer on ${caseNo}`,
        },
      );
      say(`Reviewer set to ${ctx.userById[reviewerId]?.name ?? "the selected reviewer"}.`);
      persist(() => setReviewerAction(caseNo, reviewerId));
    },
    [ctx.userById, sessionUser, say, publish, persist, caseNo],
  );

  const setDueAt = React.useCallback(
    (dueAt: string) => {
      dispatch({ type: "SET_DUE_AT", dueAt, actor: sessionUser });
      publish(
        { dueAt },
        {
          kind: "ASSIGNED",
          summary: `Resolution target moved on ${caseNo} — SLA recalculated`,
        },
      );
      say("Due date updated. The SLA countdown follows the new target.");
      persist(() => setDueAtAction(caseNo, dueAt));
    },
    [sessionUser, say, publish, persist, caseNo],
  );

  const setPriority = React.useCallback(
    (band: PriorityBand) => {
      dispatch({ type: "SET_PRIORITY", band, actor: sessionUser });
      publish(
        { priorityBand: band },
        {
          kind: "ASSIGNED",
          summary: `Priority overridden to ${PRIORITY_META[band].label.toLowerCase()} on ${caseNo}`,
        },
      );
      say(`Priority overridden to ${PRIORITY_META[band].label.toLowerCase()}.`);
      persist(() => setPriorityAction(caseNo, band));
    },
    [sessionUser, say, publish, persist, caseNo],
  );

  const setStatus = React.useCallback(
    (status: CaseStatus) => {
      dispatch({ type: "SET_STATUS", status, actor: sessionUser });
      say(`Status changed to ${CASE_STATUS_META[status].label.toLowerCase()}.`);
      persist(() => setStatusAction(caseNo, status));
    },
    [sessionUser, say, persist, caseNo],
  );

  const startWork = React.useCallback(() => {
    settle("start", () => {
      dispatch({ type: "START_WORK", actor: sessionUser });
      publish(
        { status: "IN_PROGRESS" },
        { kind: "WORK_STARTED", summary: `Work started on ${detail.case.title}` },
      );
      say("Work started. The case is now in progress and the plan is live.", "success", "timeline");
      persist(() => startWorkAction(caseNo));
    });
  }, [sessionUser, say, settle, publish, persist, caseNo, detail.case.title]);

  const addAction = React.useCallback(
    (draft: NewActionDraft) => {
      dispatch({ type: "ADD_ACTION", draft, actor: sessionUser });
      say("Corrective action added to the plan.");
      persist(() => addActionAction(caseNo, draft));
    },
    [sessionUser, say, persist, caseNo],
  );

  const setActionProgress = React.useCallback(
    (id: string, completionPct: number) => {
      dispatch({ type: "UPDATE_ACTION", id, patch: { completionPct }, actor: sessionUser });
      persist(() => updateActionAction(caseNo, id, { completionPct }));
    },
    [sessionUser, persist, caseNo],
  );

  const setActionStatus = React.useCallback(
    (id: string, status: ActionStatus) => {
      dispatch({
        type: "UPDATE_ACTION",
        id,
        patch: status === "DONE" ? { status, completionPct: 100 } : { status },
        actor: sessionUser,
      });
      if (status === "DONE") {
        const actions = sessionRef.current.actions;
        const done = actions.filter((a) => a.id === id || a.status === "DONE").length;
        publish(
          { actionsTotal: actions.length, actionsDone: done },
          {
            kind: "ACTION_COMPLETED",
            summary: `Corrective action completed on ${caseNo} — ${done} of ${actions.length} closed`,
          },
        );
        say("Action marked complete.");
      }
      persist(() => updateActionAction(caseNo, id, { status }));
    },
    [sessionUser, say, publish, persist, caseNo],
  );

  const setActionNotes = React.useCallback(
    (id: string, notes: string) => {
      dispatch({ type: "UPDATE_ACTION", id, patch: { notes }, actor: sessionUser });
      persist(() => updateActionAction(caseNo, id, { notes }));
    },
    [sessionUser, persist, caseNo],
  );

  const editAction = React.useCallback(
    (
      id: string,
      patch: { title?: string; description?: string; ownerId?: string; dueAt?: string },
    ) => {
      dispatch({ type: "UPDATE_ACTION", id, patch, actor: sessionUser });
      say("Action updated.");
      persist(() => updateActionAction(caseNo, id, patch));
    },
    [sessionUser, say, persist, caseNo],
  );

  const reorderAction = React.useCallback(
    (id: string, direction: -1 | 1) => {
      dispatch({ type: "REORDER_ACTION", id, direction, actor: sessionUser });
      persist(() => reorderActionAction(caseNo, id, direction));
    },
    [sessionUser, persist, caseNo],
  );

  const removeAction = React.useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_ACTION", id, actor: sessionUser });
      say("Action removed from the plan.");
      persist(() => removeActionAction(caseNo, id));
    },
    [sessionUser, say, persist, caseNo],
  );

  const addEvidence = React.useCallback(
    (drafts: EvidenceDraft[]) => {
      if (drafts.length === 0) return;
      settle("evidence", () => {
        dispatch({ type: "ADD_EVIDENCE", drafts, actor: sessionUser });
        publish(
          { evidenceCount: sessionRef.current.evidence.length + drafts.length },
          {
            kind: "EVIDENCE_UPLOADED",
            summary: `${drafts.length} evidence file${
              drafts.length === 1 ? "" : "s"
            } attached to ${caseNo}`,
          },
        );
        say(
          drafts.length === 1
            ? `${drafts[0]!.fileName} attached and logged against the case.`
            : `${drafts.length} files attached and logged against the case.`,
          "success",
          "evidence",
        );
        // The object URL behind an image preview stays in the browser and is
        // deliberately not sent: it names a blob in this tab's memory, which
        // is meaningless to anybody else and gone on refresh. What persists is
        // the evidence record — who filed what, against which action, and what
        // it proves.
        persist(() =>
          addEvidenceAction(
            caseNo,
            drafts.map((draft) => ({
              fileName: draft.fileName,
              kind: draft.kind,
              sizeBytes: draft.sizeBytes,
              description: draft.description,
              actionId: draft.actionId,
              ...(draft.storageUrl ? { storageUrl: draft.storageUrl } : {}),
              ...(draft.storagePath ? { storagePath: draft.storagePath } : {}),
            })),
          ),
        );
      });
    },
    [sessionUser, say, settle, publish, persist, caseNo],
  );

  const removeEvidence = React.useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_EVIDENCE", id, actor: sessionUser });
      say("Evidence removed from the case.");
      persist(() => removeEvidenceAction(caseNo, id));
    },
    [sessionUser, say, persist, caseNo],
  );

  const addComment = React.useCallback(
    (body: string, parentId: string | null, attachments: CaseCommentAttachment[]) => {
      const mentions = detail.assignableUsers
        .filter((user) => body.includes(`@${user.name}`))
        .map((user) => user.id);
      dispatch({
        type: "ADD_COMMENT",
        body,
        parentId,
        attachments,
        mentions,
        actor: sessionUser,
      });
      persist(() => addCommentAction(caseNo, body));
    },
    [detail.assignableUsers, sessionUser, persist, caseNo],
  );

  const requestVerification = React.useCallback(() => {
    settle("request-verification", () => {
      dispatch({ type: "REQUEST_VERIFICATION", actor: sessionUser });
      publish(
        {
          status: "PENDING_VERIFY",
          actionsTotal: sessionRef.current.actions.length,
          actionsDone: sessionRef.current.actions.filter((a) => a.status === "DONE").length,
          evidenceCount: sessionRef.current.evidence.length,
        },
        {
          kind: "VERIFICATION_REQUESTED",
          summary: `Verification requested on ${caseNo} — awaiting ${
            ctx.userById[sessionRef.current.reviewerId]?.name ?? "the reviewer"
          }`,
        },
      );
      say(
        `Sent to ${
          ctx.userById[sessionRef.current.reviewerId]?.name ?? "the reviewer"
        } for sign-off. The case is now waiting verification.`,
        "success",
        "verification",
      );
      persist(() => requestVerificationAction(caseNo));
    });
  }, [ctx.userById, sessionUser, say, settle, publish, persist, caseNo]);

  const decideVerification = React.useCallback(
    (draft: VerificationDraft) => {
      settle("decide", () => {
        dispatch({ type: "DECIDE_VERIFICATION", draft, actor: sessionUser });
        const approved = draft.decision === "APPROVED";
        publish(
          {
            status: approved ? "VERIFIED" : "IN_PROGRESS",
            verificationDecision: draft.decision,
            ...(approved
              ? {
                  verifiedAt: NOW_ISO,
                  closedAt: NOW_ISO,
                  // Verified is the only path that moves exposure into recovered.
                  revenueRecovered: detail.case.revenueAtRisk,
                }
              : {}),
          },
          {
            kind: approved ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
            summary: approved
              ? `Verified and closed ${caseNo} — ${formatMoney(
                  detail.case.revenueAtRisk,
                  detail.case.currency,
                )} recovered`
              : `Verification returned on ${caseNo} — back with the owner`,
          },
        );
        say(
          draft.decision === "APPROVED"
            ? "Verified. The outcome is recorded against the measurement window and the SLA clock has stopped."
            : draft.decision === "REJECTED"
              ? "Verification rejected. The case is back with the owner."
              : "Sent back to the owner with your comments.",
          draft.decision === "APPROVED" ? "success" : "info",
          "verification",
        );
        // Segregation of duties is checked again on the server, where it
        // cannot be bypassed. A reviewer the UI would have let through still
        // gets refused there, and the refusal is what the person sees.
        persist(() => decideVerificationAction(caseNo, draft));
      });
    },
    [sessionUser, say, settle, publish, persist, caseNo, detail.case],
  );

  const exportRecord = React.useCallback(() => {
    const filename = exportCase(detail, sessionRef.current);
    say(`Exported ${filename}.`);
  }, [detail, say]);

  const owner = session.ownerId ? (ctx.userById[session.ownerId] ?? null) : null;
  const reviewer = ctx.userById[session.reviewerId] ?? detail.reviewer;

  // The highlight is deliberately short-lived: it answers "did that land?" and
  // then gets out of the way rather than leaving the page permanently marked up.
  const [highlightSeq, setHighlightSeq] = React.useState<number | null>(null);
  const lastChangeSeq = session.lastChange?.seq ?? null;

  React.useEffect(() => {
    if (lastChangeSeq === null) return;
    setHighlightSeq(lastChangeSeq);
    const timer = window.setTimeout(() => {
      setHighlightSeq((current) => (current === lastChangeSeq ? null : current));
    }, HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [lastChangeSeq]);

  const recentIds = React.useMemo(() => {
    const change = session.lastChange;
    if (!change || change.seq !== highlightSeq) return new Set<string>();
    return new Set(
      [change.timelineId, change.auditId, change.targetId].filter(
        (id): id is string => id !== null,
      ),
    );
  }, [session.lastChange, highlightSeq]);

  const health = React.useMemo(
    () =>
      scoreCaseHealth(
        {
          status: session.status,
          ownerId: session.ownerId,
          dueAt: session.dueAt,
          escalationLevel: detail.case.escalationLevel,
          recurrenceCount: detail.case.recurrenceCount,
          priorityBand: session.priorityBand,
          actions: session.actions,
        },
        DEMO_NOW,
      ),
    [
      session.status,
      session.ownerId,
      session.dueAt,
      session.priorityBand,
      session.actions,
      detail.case.escalationLevel,
      detail.case.recurrenceCount,
    ],
  );

  return {
    session,
    owner,
    reviewer,
    actor: sessionUser,
    health,
    notice,
    dismissNotice,
    pending,
    recentIds,
    assignOwner,
    setReviewer,
    setDueAt,
    setPriority,
    setStatus,
    startWork,
    addAction,
    setActionProgress,
    setActionStatus,
    setActionNotes,
    editAction,
    reorderAction,
    removeAction,
    addEvidence,
    removeEvidence,
    addComment,
    requestVerification,
    decideVerification,
    exportRecord,
  };
}

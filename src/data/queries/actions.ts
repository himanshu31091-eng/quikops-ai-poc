import { EXCEPTION_META } from "@/src/config/app-config";
import { isOpenStatus } from "@/src/domain/case-status";
import { isOpenAction } from "@/src/domain/action-sla";
import {
  scoreRecommendationConfidence,
  type RecommendationConfidence,
} from "@/src/domain/action-recommendation";
import type {
  CaseAuditEntry,
  CaseComment,
  CaseEvidence,
  CaseListItem,
  CaseTimelineEvent,
  CorrectiveAction,
  Plant,
  User,
} from "@/src/domain/types";
import { CASES } from "../fixtures/cases";
import {
  buildAuditLog,
  buildComments,
  buildCorrectiveActions,
  buildEvidence,
  buildExecutiveSummary,
  buildTimeline,
  buildVerification,
  reviewerFor,
} from "../fixtures/case-detail";
import { PLANTS } from "../fixtures/organisation";
import {
  fillTemplate,
  RECOMMENDATION_TEMPLATES,
} from "../fixtures/recommendations";
import { assignableUsers, toCaseListItem } from "./case-mapper";

/**
 * Action Center data access.
 *
 * The corrective actions across every case, plus the context each one needs
 * when its drawer opens. Built from the same `buildCorrectiveActions` the case
 * page uses, so an action never shows a different title, owner or due date
 * depending on which screen you opened it from.
 *
 * Same contract as every other query module: async, finished view model,
 * fixture read swappable for a real query without touching a caller.
 */

/** The case facts an action row and its drawer need, without the full record. */
export interface ActionCaseContext {
  caseNo: string;
  caseTitle: string;
  caseStatus: CaseListItem["status"];
  plantCode: string;
  plantName: string;
  exceptionType: CaseListItem["exceptionType"];
  exceptionLabel: string;
  priorityBand: CaseListItem["priorityBand"];
  priorityScore: number;
  revenueAtRisk: number;
  currency: string;
  customerName: string | null;
  supplierName: string | null;
  materialCode: string | null;
  ownerId: string | null;
  reviewerId: string;
  escalationLevel: number;
  recurrenceCount: number;
  isBreached: boolean;
  isOpen: boolean;
  /** Problem statement from the case's executive summary. */
  problem: string;
  rootCause: string;
}

/** What the drawer shows beneath the action itself. */
export interface ActionDrawerContext {
  timeline: CaseTimelineEvent[];
  comments: CaseComment[];
  evidence: CaseEvidence[];
  audit: CaseAuditEntry[];
}

export interface ActionRecommendation {
  id: string;
  caseNo: string;
  headline: string;
  suggestion: string;
  rationale: string;
  /** The action created if the recommendation is applied. */
  actionTitle: string;
  actionDescription: string;
  icon: string;
  confidence: RecommendationConfidence;
  /** Ranking inputs, surfaced so the panel can explain its order. */
  revenueAtRisk: number;
  currency: string;
  priorityScore: number;
}

export interface ActionCenterData {
  actions: CorrectiveAction[];
  contextByCaseNo: Record<string, ActionCaseContext>;
  drawerByCaseNo: Record<string, ActionDrawerContext>;
  recommendations: ActionRecommendation[];
  assignableUsers: User[];
  plants: Plant[];
}

/** Open cases against the same supplier — corroboration for a recommendation. */
function supplierOpenCount(item: CaseListItem, all: CaseListItem[]): number {
  if (!item.supplierCode) return 0;
  return all.filter(
    (entry) =>
      entry.supplierCode === item.supplierCode &&
      entry.caseNo !== item.caseNo &&
      isOpenStatus(entry.status),
  ).length;
}

function buildContext(item: CaseListItem): ActionCaseContext {
  const summary = buildExecutiveSummary(item);
  return {
    caseNo: item.caseNo,
    caseTitle: item.title,
    caseStatus: item.status,
    plantCode: item.plantCode,
    plantName: item.plant.name,
    exceptionType: item.exceptionType,
    exceptionLabel: EXCEPTION_META[item.exceptionType].label,
    priorityBand: item.priorityBand,
    priorityScore: item.priorityScore,
    revenueAtRisk: item.revenueAtRisk,
    currency: item.currency,
    customerName: item.customerName,
    supplierName: item.supplierName,
    materialCode: item.materialCode,
    ownerId: item.ownerId,
    reviewerId: reviewerFor(item).id,
    escalationLevel: item.escalationLevel,
    recurrenceCount: item.recurrenceCount,
    isBreached: item.slaBreachedAt !== null,
    isOpen: isOpenStatus(item.status),
    problem: summary.problem,
    rootCause: summary.rootCause,
  };
}

/**
 * Recommendations are produced for open cases only, and only where there is
 * something left to recommend — a case whose plan is complete and sitting with
 * a reviewer does not need another suggested action.
 */
function buildRecommendation(
  item: CaseListItem,
  actions: CorrectiveAction[],
  all: CaseListItem[],
): ActionRecommendation | null {
  if (!isOpenStatus(item.status)) return null;

  const openActions = actions.filter((action) => isOpenAction(action.status));
  const hasPlan = actions.length > 0;
  if (hasPlan && openActions.length === 0) return null;

  const template = RECOMMENDATION_TEMPLATES[item.exceptionType];
  const values = {
    supplier: item.supplierName,
    material: item.materialCode,
    customer: item.customerName,
    plant: item.plant.name,
  };

  return {
    id: `rec_${item.caseNo}`,
    caseNo: item.caseNo,
    headline: template.headline,
    suggestion: fillTemplate(template.suggestion, values),
    rationale: fillTemplate(template.rationale, values),
    actionTitle: fillTemplate(template.actionTitle, values),
    actionDescription: fillTemplate(template.actionDescription, values),
    icon: template.icon,
    confidence: scoreRecommendationConfidence({
      recurrenceCount: item.recurrenceCount,
      escalationLevel: item.escalationLevel,
      customerTier: item.customerTier,
      supplierOpenCases: supplierOpenCount(item, all),
      isBreached: item.slaBreachedAt !== null,
    }),
    revenueAtRisk: item.revenueAtRisk,
    currency: item.currency,
    priorityScore: item.priorityScore,
  };
}

export async function getActionCenterData(): Promise<ActionCenterData> {
  const all = CASES.map(toCaseListItem);

  const actions: CorrectiveAction[] = [];
  const contextByCaseNo: Record<string, ActionCaseContext> = {};
  const drawerByCaseNo: Record<string, ActionDrawerContext> = {};
  const recommendations: ActionRecommendation[] = [];

  for (const item of all) {
    const caseActions = buildCorrectiveActions(item);
    actions.push(...caseActions);
    contextByCaseNo[item.caseNo] = buildContext(item);

    const evidence = buildEvidence(item, caseActions);
    const verification = buildVerification(item, caseActions);
    const timeline = buildTimeline(item, caseActions, evidence, verification);

    drawerByCaseNo[item.caseNo] = {
      timeline,
      comments: buildComments(item),
      evidence,
      audit: buildAuditLog(item, timeline, verification),
    };

    const recommendation = buildRecommendation(item, caseActions, all);
    if (recommendation) recommendations.push(recommendation);
  }

  return {
    actions,
    contextByCaseNo,
    drawerByCaseNo,
    // Highest confidence first, then by what is at stake — a 90%-confident
    // recommendation on a $12k case is worth less attention than an
    // 85%-confident one on a $220k case, so revenue breaks the tie.
    recommendations: recommendations.sort(
      (a, b) =>
        b.confidence.score - a.confidence.score || b.revenueAtRisk - a.revenueAtRisk,
    ),
    assignableUsers: assignableUsers(),
    plants: PLANTS,
  };
}

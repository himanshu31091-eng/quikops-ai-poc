import { EXCEPTION_META } from "@/src/config/app-config";
import { isOpenStatus } from "@/src/domain/case-status";
import type {
  CaseAiInsight,
  CaseAuditEntry,
  CaseComment,
  CaseEvidence,
  CaseExecutiveSummary,
  CaseHealth,
  CaseInformation,
  CaseListItem,
  CaseTimelineEvent,
  CorrectiveAction,
  Plant,
  RelatedCaseRef,
  User,
  VerificationRecord,
} from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatMoney } from "@/src/lib/format";
import { CASES } from "../fixtures/cases";
import {
  buildAuditLog,
  buildCaseHealth,
  buildCaseInformation,
  buildComments,
  buildCorrectiveActions,
  buildEvidence,
  buildExecutiveSummary,
  buildTimeline,
  buildVerification,
  reviewerFor,
} from "../fixtures/case-detail";
import { EXECUTION_METRICS } from "../fixtures/metrics";
import { PLANTS } from "../fixtures/organisation";
import { assignableUsers, toCaseListItem } from "./case-mapper";

/**
 * Case Detail data access. One call returns the complete execution record so
 * the page renders in a single pass; swapping fixtures for Prisma replaces the
 * bodies here and nothing above changes.
 */

const MINUTE_MS = 60_000;

function toRelatedRef(source: CaseListItem, relation: string): RelatedCaseRef {
  return {
    caseNo: source.caseNo,
    title: source.title,
    status: source.status,
    priorityBand: source.priorityBand,
    plantCode: source.plantCode,
    revenueAtRisk: source.revenueAtRisk,
    openedAt: source.openedAt,
    relation,
  };
}

/**
 * Cases a manager needs to see alongside this one. Ordered by how directly
 * they bear on the same decision: the same material at the same plant first,
 * then the same customer, then the same exception type across the network.
 */
function buildRelatedCases(item: CaseListItem, all: CaseListItem[]): RelatedCaseRef[] {
  const others = all.filter((entry) => entry.caseNo !== item.caseNo);
  const seen = new Set<string>();
  const related: RelatedCaseRef[] = [];

  const take = (candidates: CaseListItem[], relation: string, limit: number) => {
    for (const candidate of candidates) {
      if (related.length >= 6) return;
      if (seen.has(candidate.caseNo)) continue;
      if (limit <= 0) return;
      seen.add(candidate.caseNo);
      related.push(toRelatedRef(candidate, relation));
      limit -= 1;
    }
  };

  if (item.materialCode) {
    take(
      others.filter(
        (entry) => entry.materialCode === item.materialCode && entry.plantCode === item.plantCode,
      ),
      "Same material, same plant",
      2,
    );
    take(
      others.filter((entry) => entry.materialCode === item.materialCode),
      "Same material",
      2,
    );
  }
  if (item.customerCode) {
    take(
      others.filter((entry) => entry.customerCode === item.customerCode),
      "Same customer",
      2,
    );
  }
  take(
    others.filter(
      (entry) => entry.exceptionType === item.exceptionType && entry.plantCode === item.plantCode,
    ),
    "Same exception type, same plant",
    2,
  );

  return related;
}

/** Everything open against the same supplier — the vendor conversation view. */
function buildSupplierIssues(item: CaseListItem, all: CaseListItem[]): RelatedCaseRef[] {
  if (!item.supplierCode) return [];
  return all
    .filter(
      (entry) => entry.supplierCode === item.supplierCode && entry.caseNo !== item.caseNo,
    )
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((entry) =>
      toRelatedRef(
        entry,
        isOpenStatus(entry.status) ? "Open against this supplier" : "Closed against this supplier",
      ),
    );
}

/**
 * Pre-generated insights, stored exactly as the production path stores them.
 * The Copilot panel produces new ones on demand; these are what the panel has
 * already produced for this case and are shown without waiting on a model.
 */
function buildAiInsights(
  item: CaseListItem,
  supplierIssues: RelatedCaseRef[],
  actions: CorrectiveAction[],
): CaseAiInsight[] {
  const insights: CaseAiInsight[] = [];
  const ago = (minutes: number) =>
    new Date(DEMO_NOW.getTime() - minutes * MINUTE_MS).toISOString();

  if (item.recurrenceCount > 1) {
    insights.push({
      id: `ins_${item.caseNo}_recurrence`,
      label: "Recurrence pattern",
      body: `This is detection ${item.recurrenceCount} against ${
        item.materialCode ?? "this material"
      } and ${
        item.supplierName ?? "this source"
      }. The previous corrective action closed without changing the underlying condition, so treat the root cause as unresolved rather than reopening the same containment.`,
      tone: item.recurrenceCount > 2 ? "critical" : "high",
      generatedAt: ago(64),
    });
  }

  if (supplierIssues.length > 0) {
    const openIssues = supplierIssues.filter((entry) => isOpenStatus(entry.status));
    const exposure = openIssues.reduce((sum, entry) => sum + entry.revenueAtRisk, 0);
    insights.push({
      id: `ins_${item.caseNo}_supplier`,
      label: "Supplier exposure",
      body: `${item.supplierName} carries ${openIssues.length} other open case${
        openIssues.length === 1 ? "" : "s"
      } worth ${formatMoney(
        exposure,
        item.currency,
      )} across the network. Escalating commercially once will move more than resolving these case by case.`,
      tone: openIssues.length > 1 ? "high" : "info",
      generatedAt: ago(97),
    });
  }

  const blocked = actions.filter((action) => action.status === "BLOCKED");
  if (blocked.length > 0) {
    insights.push({
      id: `ins_${item.caseNo}_blocked`,
      label: "Blocked work",
      body: `${blocked.length} action${
        blocked.length === 1 ? " is" : "s are"
      } waiting on an external party. On comparable cases this is the single largest contributor to SLA breach — a chase now is worth more than starting the next action.`,
      tone: "high",
      generatedAt: ago(143),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: `ins_${item.caseNo}_baseline`,
      label: "Execution read",
      body: `Nothing unusual in the execution pattern. ${
        actions.filter((a) => a.status === "DONE").length
      } of ${actions.length} actions are complete and the case is tracking against a ${
        EXECUTION_METRICS.mttrHours
      }-hour portfolio mean time to resolve.`,
      tone: "info",
      generatedAt: ago(112),
    });
  }

  return insights;
}

export interface CaseDetailModel {
  case: CaseListItem;
  reviewer: User;
  information: CaseInformation;
  summary: CaseExecutiveSummary;
  actions: CorrectiveAction[];
  evidence: CaseEvidence[];
  comments: CaseComment[];
  timeline: CaseTimelineEvent[];
  audit: CaseAuditEntry[];
  verification: VerificationRecord | null;
  related: RelatedCaseRef[];
  supplierIssues: RelatedCaseRef[];
  insights: CaseAiInsight[];
  health: CaseHealth;
  /** Reference data the editable sections need. */
  assignableUsers: User[];
  plants: Plant[];
  exceptionLabel: string;
}

export async function getCaseDetail(caseNo: string): Promise<CaseDetailModel | null> {
  const normalised = decodeURIComponent(caseNo).trim().toUpperCase();
  const source = CASES.find((entry) => entry.caseNo.toUpperCase() === normalised);
  if (!source) return null;

  const item = toCaseListItem(source);
  const all = CASES.map(toCaseListItem);

  const actions = buildCorrectiveActions(item);
  const evidence = buildEvidence(item, actions);
  const verification = buildVerification(item, actions);
  const timeline = buildTimeline(item, actions, evidence, verification);
  const supplierIssues = buildSupplierIssues(item, all);

  return {
    case: item,
    reviewer: reviewerFor(item),
    information: buildCaseInformation(item),
    summary: buildExecutiveSummary(item),
    actions,
    evidence,
    comments: buildComments(item),
    timeline,
    audit: buildAuditLog(item, timeline, verification),
    verification,
    related: buildRelatedCases(item, all),
    supplierIssues,
    insights: buildAiInsights(item, supplierIssues, actions),
    health: buildCaseHealth(item, actions),
    assignableUsers: assignableUsers(),
    plants: PLANTS,
    exceptionLabel: EXCEPTION_META[item.exceptionType].label,
  };
}

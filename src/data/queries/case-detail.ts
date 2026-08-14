import { EXCEPTION_META } from "@/src/config/app-config";
import { INVENTORY_HEALTH } from "../fixtures/metrics";
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
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { USE_DATABASE } from "../db";
import {
  findAssignableUsersForTenant,
  findCasesForTenant,
  findPlantsForTenant,
} from "./case-db-mapper";
import { chooseReviewer, findCaseDetailRecords } from "./case-detail-db-mapper";
import type { CaseActorDirectory } from "../fixtures/case-detail";

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

/**
 * An indicator moving in the same plant during the same window as the case.
 *
 * Deliberately *not* called a consequence. Improving one measure often puts
 * pressure on another — protecting delivery dates by expediting and
 * re-sequencing tends to show up in inventory and changeover time — but whether
 * this case caused this movement is a question for the operational team, not
 * for a data-access layer. These are surfaced so management can ask; the
 * platform does not answer.
 */
export interface RelatedIndicator {
  label: string;
  reading: string;
  target: string;
  /** Which way the reading has gone against its target. */
  direction: "PRESSURE" | "STABLE";
  /** Why it is on this panel at all — the open cases behind it. */
  context: string;
}

/**
 * Indicators worth watching alongside this case: inventory coverage at the same
 * plant, and any open capacity or inventory cases raised there. Everything is
 * read from the same corpus the rest of the product reads.
 */
function buildRelatedIndicators(
  item: CaseListItem,
  all: CaseListItem[],
): RelatedIndicator[] {
  const indicators: RelatedIndicator[] = [];

  const inventory = INVENTORY_HEALTH.find((row) => row.plantCode === item.plantCode);
  if (inventory) {
    const under = inventory.inventoryDays < inventory.targetDays;
    indicators.push({
      label: "Finished-goods coverage",
      reading: `${inventory.inventoryDays} days`,
      target: `${inventory.targetDays}-day policy`,
      direction: under ? "PRESSURE" : "STABLE",
      context: under
        ? `${inventory.stockoutRiskSkus} SKUs at stockout risk at ${inventory.plantName}. Expediting protects a delivery date; it does not rebuild coverage.`
        : `Coverage is at or above policy at ${inventory.plantName}.`,
    });
  }

  const samePlantOpen = all.filter(
    (entry) =>
      entry.plantCode === item.plantCode &&
      entry.caseNo !== item.caseNo &&
      isOpenStatus(entry.status),
  );

  const capacity = samePlantOpen.filter(
    (entry) => entry.exceptionType === "CAPACITY_CONSTRAINT",
  );
  if (capacity.length > 0) {
    indicators.push({
      label: "Production capacity",
      reading: `${capacity.length} open case${capacity.length === 1 ? "" : "s"}`,
      target: "no open constraint",
      direction: "PRESSURE",
      context:
        "Re-sequencing to protect committed orders changes what the line runs and when. These are the capacity cases already open at this plant during the same window.",
    });
  }

  const excess = samePlantOpen.filter(
    (entry) =>
      entry.exceptionType === "INVENTORY_EXCESS" ||
      entry.exceptionType === "INVENTORY_STOCKOUT",
  );
  if (excess.length > 0) {
    indicators.push({
      label: "Inventory position",
      reading: `${excess.length} open case${excess.length === 1 ? "" : "s"}`,
      target: "within policy band",
      direction: "PRESSURE",
      context:
        "Excess and stockout cases open at this plant in the same period. Both move when supply is expedited.",
    });
  }

  return indicators;
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
  /** Indicators to weigh alongside the outcome. Surfaced, never attributed. */
  relatedIndicators: RelatedIndicator[];
  /** Reference data the editable sections need. */
  assignableUsers: User[];
  plants: Plant[];
  exceptionLabel: string;
}

export async function getCaseDetail(
  caseNo: string,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<CaseDetailModel | null> {
  const normalised = decodeURIComponent(caseNo).trim().toUpperCase();

  // Both sources produce the same six pieces of the execution record. Which
  // one ran is invisible from here down: everything after this block reads the
  // same view models, which is why the cards needed no changes.
  let item: CaseListItem;
  let all: CaseListItem[];
  let reviewer: User;
  let actions: CorrectiveAction[];
  let evidence: CaseEvidence[];
  let verification: VerificationRecord | null;
  let timeline: CaseTimelineEvent[];
  let audit: CaseAuditEntry[];
  let comments: CaseComment[];
  let people: User[];
  let plants: Plant[];

  if (USE_DATABASE) {
    // Tenant is applied in the query, not here: `findCasesForTenant` filters in
    // its WHERE clause and the record lookup below uses the composite
    // (tenantId, caseNo) key, so another tenant's case number never resolves.
    all = await findCasesForTenant(tenantId, DEMO_NOW);
    const found = all.find((entry) => entry.caseNo.toUpperCase() === normalised);
    if (!found) return null;
    item = found;

    const [records, dbPeople, dbPlants] = await Promise.all([
      findCaseDetailRecords(tenantId, item),
      findAssignableUsersForTenant(tenantId),
      findPlantsForTenant(tenantId),
    ]);
    if (!records) return null;

    people = dbPeople;
    plants = dbPlants;
    actions = records.actions;
    evidence = records.evidence;
    verification = records.verification;
    audit = records.audit;
    // A case may carry no named reviewer; the routing rule then picks one from
    // the tenant's own people. `reviewerFor` is the last resort only so the
    // model stays non-null — with a seeded tenant it is never reached.
    reviewer = records.reviewer ?? chooseReviewer(item, people) ?? reviewerFor(item);

    const directory: CaseActorDirectory = { userById: records.userById, reviewer };
    // Derived from the database-backed actions, evidence and verification by
    // the same builder the fixtures use — there is no timeline table, because a
    // timeline is a reading of the record rather than a second copy of it.
    timeline = buildTimeline(item, actions, evidence, verification, directory);
    comments = records.comments;
  } else {
    const source = CASES.find((entry) => entry.caseNo.toUpperCase() === normalised);
    if (!source) return null;
    item = toCaseListItem(source);
    all = CASES.map(toCaseListItem);

    reviewer = reviewerFor(item);
    actions = buildCorrectiveActions(item);
    evidence = buildEvidence(item, actions);
    verification = buildVerification(item, actions);
    timeline = buildTimeline(item, actions, evidence, verification);
    audit = buildAuditLog(item, timeline, verification);
    comments = buildComments(item);
    people = assignableUsers();
    plants = PLANTS;
  }

  const supplierIssues = buildSupplierIssues(item, all);

  return {
    case: item,
    reviewer,
    information: buildCaseInformation(item),
    summary: buildExecutiveSummary(item),
    actions,
    evidence,
    comments,
    timeline,
    audit,
    verification,
    related: buildRelatedCases(item, all),
    relatedIndicators: buildRelatedIndicators(item, all),
    supplierIssues,
    insights: buildAiInsights(item, supplierIssues, actions),
    health: buildCaseHealth(item, actions),
    assignableUsers: people,
    plants,
    exceptionLabel: EXCEPTION_META[item.exceptionType].label,
  };
}

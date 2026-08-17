/**
 * Domain model. No framework imports. These types are the contract between the
 * data-access layer and the UI, and they mirror prisma/schema.prisma exactly so
 * swapping fixtures for live Neon queries requires no component changes.
 */

export const CASE_STATUSES = [
  "NEW",
  "TRIAGED",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_VERIFY",
  "VERIFIED",
  "CLOSED",
  "DISMISSED",
  "REOPENED",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const PRIORITY_BANDS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type PriorityBand = (typeof PRIORITY_BANDS)[number];

export const EXCEPTION_TYPES = [
  "VENDOR_DELAY",
  "MATERIAL_SHORTAGE",
  "CAPACITY_CONSTRAINT",
  "QUALITY_HOLD",
  "INVENTORY_EXCESS",
  "INVENTORY_STOCKOUT",
  "PLANNING_DEVIATION",
  "DELIVERY_AT_RISK",
  "OTHER",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

/**
 * Where the case came from. The enterprise data platform raises the overwhelming majority; the
 * rest are opened by hand or by a playbook's own monitoring rule.
 */
export const DETECTION_SOURCES = ["EVERY_ANGLE", "PLAYBOOK_MONITOR", "MANUAL"] as const;
export type DetectionSource = (typeof DETECTION_SOURCES)[number];

export const USER_ROLES = [
  "EXECUTIVE",
  "OPS_MANAGER",
  "TASK_OWNER",
  "ANALYST",
  "ADMINISTRATOR",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const KPI_KEYS = [
  "OTIF_PCT",
  "REVENUE_AT_RISK",
  "INVENTORY_DAYS",
  "SUPPLIER_OTD_PCT",
  "SCHEDULE_ADHERENCE_PCT",
  "FORECAST_ACCURACY_PCT",
] as const;
export type KpiKey = (typeof KPI_KEYS)[number];

export type CustomerTier = "TIER_1" | "TIER_2" | "TIER_3";
export type ActionStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
export type ActionOrigin = "MANUAL" | "AI_SUGGESTED" | "PLAYBOOK";
export type KpiPhase = "BASELINE" | "INTERIM" | "POST_CLOSE";
export type ConnectorStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "RUNNING";

export interface Plant {
  id: string;
  code: string;
  name: string;
  country: string;
  countryCode: string;
  timezone: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  jobTitle: string;
  plantScope: string[];
  isActive: boolean;
}

export interface PriorityFactor {
  factor: string;
  raw: string;
  weighted: number;
}

export interface OperationalCase {
  id: string;
  caseNo: string;
  title: string;
  description: string;
  exceptionType: ExceptionType;
  detectedBy: DetectionSource;
  /**
   * The enterprise system the signal came from, and the record inside it.
   *
   * QuikOps holds neither: an operational case is raised *about* a purchase
   * order, a batch or a delivery that continues to live in the system of
   * record. Carrying the pair on the case is what lets a reader trace a
   * QuikOps case back to the ERP row it was raised from, and is why the
   * product can say it consumes operational signals rather than inventing them.
   */
  sourceSystem: string;
  sourceRecord: string;
  status: CaseStatus;
  priorityBand: PriorityBand;
  priorityScore: number;
  priorityFactors: PriorityFactor[];
  escalationLevel: number;
  plantCode: string;
  materialCode: string | null;
  materialDesc: string | null;
  customerCode: string | null;
  customerName: string | null;
  customerTier: CustomerTier | null;
  supplierCode: string | null;
  supplierName: string | null;
  revenueAtRisk: number;
  currency: string;
  kpiKey: KpiKey;
  baselineValue: number;
  targetValue: number;
  measurementWindowDays: number;
  ownerId: string | null;
  openedAt: string;
  assignedAt: string | null;
  dueAt: string;
  slaBreachedAt: string | null;
  verifiedAt: string | null;
  closedAt: string | null;
  recurrenceCount: number;
  lastDetectedAt: string;
  playbookId: string | null;
}

/** A case joined with its display-side relations. What the UI actually renders. */
export interface CaseListItem extends OperationalCase {
  owner: User | null;
  plant: Plant;
  openActionCount: number;
  totalActionCount: number;
}

export interface ActionItem {
  id: string;
  caseId: string;
  caseNo: string;
  caseTitle: string;
  title: string;
  description: string;
  ownerId: string;
  status: ActionStatus;
  origin: ActionOrigin;
  dueAt: string;
  completedAt: string | null;
  priorityBand: PriorityBand;
  plantCode: string;
}

export interface KpiSnapshot {
  id: string;
  caseId: string | null;
  kpiKey: KpiKey;
  scopeLevel: "PLANT" | "MATERIAL" | "CUSTOMER" | "GLOBAL";
  scopeRef: string;
  value: number;
  measuredAt: string;
  phase: KpiPhase | null;
  sourceSystem: string;
}

export interface AiCitation {
  type: "case" | "kpi_snapshot" | "playbook";
  ref: string;
  label: string;
}

export interface AiExecutiveSummary {
  id: string;
  headline: string;
  paragraphs: string[];
  callouts: { label: string; detail: string; tone: "critical" | "high" | "success" }[];
  citations: AiCitation[];
  model: string;
  promptVersion: string;
  generatedAt: string;
  scope: string;
}

export interface ActivityEvent {
  id: string;
  kind:
    | "SIGNAL_INGESTED"
    | "CASE_CREATED"
    | "CASE_ASSIGNED"
    | "ACTION_COMPLETED"
    | "VERIFICATION_SUBMITTED"
    | "VERIFICATION_APPROVED"
    | "VERIFICATION_REJECTED"
    | "CASE_ESCALATED"
    | "CASE_CLOSED"
    | "COMMENT_ADDED"
    | "PLAYBOOK_APPLIED";
  actorName: string | null;
  actorRole: UserRole | null;
  caseNo: string | null;
  summary: string;
  at: string;
}

export interface PlantHealth {
  plant: Plant;
  otifPct: number;
  otifDeltaPts: number;
  openCases: number;
  criticalCases: number;
  revenueAtRisk: number;
  slaAdherencePct: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface PriorityDistributionSlice {
  band: PriorityBand;
  count: number;
  revenueAtRisk: number;
}

export interface RevenueImpactBucket {
  exceptionType: ExceptionType;
  atRisk: number;
  recovered: number;
  caseCount: number;
}

export interface InventoryHealthRow {
  plantCode: string;
  plantName: string;
  inventoryDays: number;
  targetDays: number;
  stockoutRiskSkus: number;
  excessValue: number;
  status: "AT_RISK" | "WATCH" | "HEALTHY";
}

export interface ExecutionMetrics {
  mttrHours: number;
  mttrDeltaPct: number;
  slaAdherencePct: number;
  slaAdherenceDeltaPts: number;
  verificationPassRatePct: number;
  recurrenceRatePct: number;
  casesClosedThisWeek: number;
  casesOpenedThisWeek: number;
}

/* ------------------------------------------------------- Case detail model */

/**
 * The execution record of a single case. Everything below is the working
 * surface of the Case Detail module: what happened, who did it, what was
 * produced as proof, and what a reviewer decided.
 */
export const CASE_EVENT_KINDS = [
  "DETECTED",
  "CASE_CREATED",
  "TRIAGED",
  "ASSIGNED",
  "WORK_STARTED",
  "ACTION_ADDED",
  "ACTION_COMPLETED",
  "EVIDENCE_UPLOADED",
  "COMMENT_ADDED",
  "PLAYBOOK_APPLIED",
  "ESCALATED",
  "VERIFICATION_REQUESTED",
  "VERIFICATION_APPROVED",
  "VERIFICATION_REJECTED",
  "REOPENED",
  "CASE_CLOSED",
  "OWNER_CHANGED",
  "STATUS_CHANGED",
  "PRIORITY_CHANGED",
  "DUE_DATE_CHANGED",
] as const;
export type CaseEventKind = (typeof CASE_EVENT_KINDS)[number];

export interface CaseTimelineEvent {
  id: string;
  kind: CaseEventKind;
  at: string;
  /** Null when the platform itself acted — ingestion, escalation, SLA timers. */
  actorId: string | null;
  actorName: string;
  actorRole: UserRole | null;
  title: string;
  detail: string;
  /** Small labelled facts rendered beneath the event. */
  facts: { label: string; value: string }[];
}

export interface CaseAuditEntry {
  id: string;
  at: string;
  actorId: string | null;
  actorName: string;
  actorRole: UserRole | null;
  action: string;
  /** Field-level change, when the entry represents one. */
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  /** Where the change came from — UI, connector, rule engine. */
  source: "EVERY_ANGLE" | "WORK_MANAGER" | "CASE_DETAIL" | "RULE_ENGINE" | "API";
}

export const EVIDENCE_KINDS = ["IMAGE", "PDF", "SPREADSHEET", "DOCUMENT", "NOTE"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export interface CaseEvidence {
  id: string;
  caseId: string;
  fileName: string;
  kind: EvidenceKind;
  sizeBytes: number;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  description: string;
  /** Corrective action this evidence was filed against, when applicable. */
  actionId: string | null;
  /** Accepted by the reviewer during verification. */
  accepted: boolean;
  /** Present only for evidence created in-session, so it can be previewed. */
  objectUrl?: string;
  /**
   * Whether a file is actually stored behind this record.
   *
   * A boolean rather than the storage URL: the store is private, the URL is
   * useless without a server credential, and shipping it to a browser would
   * only invite someone to try. The download route addresses the evidence by
   * id and checks the tenant itself.
   *
   * False for records filed before storage existed and for seeded evidence —
   * both remain valid; they simply have nothing to open.
   */
  hasStoredFile?: boolean;
}

export interface CaseCommentAttachment {
  id: string;
  name: string;
  kind: EvidenceKind;
}

export interface CaseComment {
  id: string;
  caseId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  at: string;
  /** User ids referenced with @ in the body. */
  mentions: string[];
  attachments: CaseCommentAttachment[];
}

/** A corrective action with the execution detail the case page needs. */
export interface CorrectiveAction extends ActionItem {
  /** 0–100. Owners report progress; status is derived from it, never guessed. */
  completionPct: number;
  notes: string;
  evidenceCount: number;
}

export type VerificationDecision = "APPROVED" | "REJECTED" | "SENT_BACK";

export interface VerificationRecord {
  id: string;
  caseId: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  reviewerId: string;
  reviewerName: string;
  decision: VerificationDecision | null;
  decidedAt: string | null;
  /** Reviewer's written justification. Required for every decision. */
  comment: string;
  /** What the reviewer checked, recorded against the measurement window. */
  notes: string;
  kpiKey: KpiKey;
  kpiBaseline: number;
  kpiCurrent: number | null;
  kpiTarget: number;
  measurementWindowDays: number;
}

/** Reference data the case carries beyond the operational record. */
export interface CaseInformation {
  productionLine: string;
  orderRef: string;
  orderType: "PURCHASE_ORDER" | "SALES_ORDER" | "WORK_ORDER";
  riskCategory: string;
  detectionRuleId: string;
  detectionRuleName: string;
  detectionRuleDetail: string;
  signalRef: string;
}

export interface CaseExecutiveSummary {
  problem: string;
  businessImpact: string;
  operationalImpact: string;
  rootCause: string;
  rootCauseConfidence: "CONFIRMED" | "PROBABLE" | "UNDER_INVESTIGATION";
  customerImpact: string;
  revenueImpact: string;
  targetKpi: string;
  detectionRule: string;
  whyRaised: string;
}

export interface RelatedCaseRef {
  caseNo: string;
  title: string;
  status: CaseStatus;
  priorityBand: PriorityBand;
  plantCode: string;
  revenueAtRisk: number;
  /** Carried from the case, so a chip never falls back to a global default
   *  currency that belongs to a different tenant. */
  currency: string;
  openedAt: string;
  /** Why this case is related to the one being viewed. */
  relation: string;
}

export interface CaseAiInsight {
  id: string;
  label: string;
  body: string;
  tone: "critical" | "high" | "info";
  generatedAt: string;
}

export interface CaseHealth {
  /** 0–100. Execution health, not priority: is this case on track? */
  score: number;
  band: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  drivers: { label: string; detail: string; positive: boolean }[];
}

export interface KpiCardModel {
  key: string;
  label: string;
  value: number;
  unit: "PERCENT" | "CURRENCY" | "COUNT";
  /** ISO 4217 for a CURRENCY tile. Carried so the tile never falls back to a
   *  global default belonging to a different tenant. */
  currency?: string;
  target: number | null;
  deltaValue: number;
  deltaUnit: "pts" | "%" | "abs";
  /** true when a rising number is an improvement */
  higherIsBetter: boolean;
  series: TrendPoint[];
  footnote: string;
  href: string;
}

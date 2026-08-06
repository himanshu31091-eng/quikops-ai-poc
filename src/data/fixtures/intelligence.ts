import type { ActionItem, ActivityEvent, AiExecutiveSummary } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const ago = (ms: number): string => new Date(DEMO_NOW.getTime() - ms).toISOString();

/**
 * Pre-generated at seed time and stored, exactly as the production path does.
 * The Regenerate control issues a live call; the cached version is what renders
 * on load so the dashboard is never waiting on a model.
 */
export const EXECUTIVE_SUMMARY: AiExecutiveSummary = {
  id: "ai_exec_20260805",
  headline:
    "Querétaro is the primary driver of the group OTIF shortfall, and the cause is a repeat vendor issue rather than a new disruption.",
  paragraphs: [
    "Group on-time-in-full closed the week at 89.2%, 5.8 points below the 95% target and down 3.1 points across the last 30 days. Querétaro accounts for roughly 61% of the deterioration; Pune and Ingolstadt both improved over the same period.",
    "The largest single exposure is a vendor delivery delay on aluminium extrusion at Querétaro, carrying $180,000 of revenue at risk against a tier-one customer. This is the third detection against the same material and vendor in 45 days, and the delay duration has grown on each occurrence, which points to a capacity problem at the supplier rather than a transport disruption.",
    "Execution performance is improving even as the operational numbers deteriorate. Mean time to resolve fell 21.6% quarter-on-quarter to 38.4 hours and SLA adherence rose 4.2 points to 86.4%. Two critical cases are currently unowned, both opened within the last 72 hours.",
  ],
  callouts: [
    {
      label: "Immediate",
      detail:
        "Two critical cases at Querétaro are unassigned, together carrying $227,800 of revenue at risk.",
      tone: "critical",
    },
    {
      label: "Recurring",
      detail:
        "Three vendors account for 11 of the 24 open cases. Nordex and Hindustan Forge have each recurred more than twice.",
      tone: "high",
    },
    {
      label: "Improving",
      detail:
        "Verification pass rate is holding at 91.3% and recurrence rate fell to 14.8% from 19.2% last quarter.",
      tone: "success",
    },
  ],
  citations: [
    { type: "case", ref: "QO-2026-004182", label: "Vendor delay — Querétaro" },
    { type: "case", ref: "QO-2026-004129", label: "Reopened — Ingolstadt" },
    { type: "case", ref: "QO-2026-004162", label: "Forging supplier — Pune" },
    { type: "kpi_snapshot", ref: "MX01/OTIF_PCT/2026-08-04", label: "MX01 OTIF baseline" },
  ],
  model: "claude-sonnet",
  promptVersion: "exec-summary.v1",
  generatedAt: ago(52 * MINUTE_MS),
  scope: "All plants · Last 30 days",
};

export const ACTIVITY_FEED: ActivityEvent[] = [
  {
    id: "act_001",
    kind: "SIGNAL_INGESTED",
    actorName: null,
    actorRole: null,
    caseNo: "QO-2026-004182",
    summary:
      "Every Angle detected vendor delay for RM-4471 at MX01 — third detection, appended to existing case",
    at: ago(2 * HOUR_MS + 57 * MINUTE_MS),
  },
  {
    id: "act_002",
    kind: "CASE_CREATED",
    actorName: null,
    actorRole: null,
    caseNo: "QO-2026-004168",
    summary: "Case opened automatically from Every Angle signal EA-2026-08-05-US-000204",
    at: ago(3 * HOUR_MS + 12 * MINUTE_MS),
  },
  {
    id: "act_003",
    kind: "VERIFICATION_APPROVED",
    actorName: "Marcus Reinhardt",
    actorRole: "OPS_MANAGER",
    caseNo: "QO-2026-004155",
    summary: "Verified corrective action on surface finish deviation — evidence accepted",
    at: ago(4 * HOUR_MS + 38 * MINUTE_MS),
  },
  {
    id: "act_004",
    kind: "ACTION_COMPLETED",
    actorName: "Carlos Mendoza",
    actorRole: "TASK_OWNER",
    caseNo: "QO-2026-004179",
    summary: "Completed 'Confirm expedited air freight booking' with 2 attachments",
    at: ago(5 * HOUR_MS + 21 * MINUTE_MS),
  },
  {
    id: "act_005",
    kind: "CASE_ESCALATED",
    actorName: null,
    actorRole: null,
    caseNo: "QO-2026-004129",
    summary: "Auto-escalated to level 2 — SLA breached with no action progress in 24h",
    at: ago(6 * HOUR_MS + 4 * MINUTE_MS),
  },
  {
    id: "act_006",
    kind: "CASE_ASSIGNED",
    actorName: "Priya Sharma",
    actorRole: "OPS_MANAGER",
    caseNo: "QO-2026-004171",
    summary: "Assigned to Carlos Mendoza with a 24-hour target",
    at: ago(8 * HOUR_MS + 45 * MINUTE_MS),
  },
  {
    id: "act_007",
    kind: "PLAYBOOK_APPLIED",
    actorName: "Priya Sharma",
    actorRole: "OPS_MANAGER",
    caseNo: "QO-2026-004115",
    summary: "Applied playbook 'Capacity constraint — changeover reduction' (3 actions)",
    at: ago(11 * HOUR_MS + 9 * MINUTE_MS),
  },
  {
    id: "act_008",
    kind: "VERIFICATION_REJECTED",
    actorName: "Marcus Reinhardt",
    actorRole: "OPS_MANAGER",
    caseNo: "QO-2026-004148",
    summary: "Verification returned — cycle-time evidence did not cover a full shift",
    at: ago(14 * HOUR_MS + 30 * MINUTE_MS),
  },
  {
    id: "act_009",
    kind: "COMMENT_ADDED",
    actorName: "Daniel Kim",
    actorRole: "ANALYST",
    caseNo: "QO-2026-004137",
    summary: "Noted the same forecast bias appears on two adjacent programmes",
    at: ago(17 * HOUR_MS + 2 * MINUTE_MS),
  },
  {
    id: "act_010",
    kind: "CASE_CLOSED",
    actorName: "Marcus Reinhardt",
    actorRole: "OPS_MANAGER",
    caseNo: "QO-2026-004151",
    summary: "Closed after 14-day measurement window — OTIF recovered to 94.6%",
    at: ago(22 * HOUR_MS + 15 * MINUTE_MS),
  },
  {
    id: "act_011",
    kind: "VERIFICATION_SUBMITTED",
    actorName: "Aisha Okonkwo",
    actorRole: "TASK_OWNER",
    caseNo: "QO-2026-004174",
    summary: "Submitted for verification with supplier disposition report attached",
    at: ago(26 * HOUR_MS + 41 * MINUTE_MS),
  },
  {
    id: "act_012",
    kind: "SIGNAL_INGESTED",
    actorName: null,
    actorRole: null,
    caseNo: null,
    summary: "Every Angle scheduled run completed — 34 signals received, 9 new cases, 25 deduplicated",
    at: ago(27 * HOUR_MS + 3 * MINUTE_MS),
  },
];

/** Today's Work — actions due for the signed-in user's teams. */
export const TODAYS_ACTIONS: ActionItem[] = [
  {
    id: "actn_101",
    caseId: "case_qo_2026_004179",
    caseNo: "QO-2026-004179",
    caseTitle: "Bearing shortage blocking assembly line 3",
    title: "Confirm alternate supplier lead time in writing",
    description:
      "Obtain written confirmation from Carolina Precision on a 9-day lead time for 4,000 units.",
    ownerId: "usr_cmendoza",
    status: "IN_PROGRESS",
    origin: "AI_SUGGESTED",
    dueAt: new Date(DEMO_NOW.getTime() + 6 * HOUR_MS).toISOString(),
    completedAt: null,
    priorityBand: "CRITICAL",
    plantCode: "US01",
  },
  {
    id: "actn_102",
    caseId: "case_qo_2026_004129",
    caseNo: "QO-2026-004129",
    caseTitle: "Reopened — precision machining vendor slipped again",
    title: "Escalate to Kaltenbach account management",
    description:
      "Raise the repeat miss with the vendor's commercial lead and request a capacity commitment.",
    ownerId: "usr_mreinhardt",
    status: "TODO",
    origin: "PLAYBOOK",
    dueAt: new Date(DEMO_NOW.getTime() + 2 * HOUR_MS).toISOString(),
    completedAt: null,
    priorityBand: "CRITICAL",
    plantCode: "DE01",
  },
  {
    id: "actn_103",
    caseId: "case_qo_2026_004176",
    caseNo: "QO-2026-004176",
    caseTitle: "Press line 2 capacity shortfall against August plan",
    title: "Model a weekend shift against the week 33 shortfall",
    description:
      "Quantify the capacity recovered by adding a Saturday shift and the incremental labour cost.",
    ownerId: "usr_tberger",
    status: "IN_PROGRESS",
    origin: "AI_SUGGESTED",
    dueAt: new Date(DEMO_NOW.getTime() - 3 * HOUR_MS).toISOString(),
    completedAt: null,
    priorityBand: "CRITICAL",
    plantCode: "DE01",
  },
  {
    id: "actn_104",
    caseId: "case_qo_2026_004171",
    caseNo: "QO-2026-004171",
    caseTitle: "Stockout risk — neodymium magnet segments",
    title: "Raise expedite request against PO-78204",
    description: "Request a 7-day pull-in on the open purchase order and confirm freight mode.",
    ownerId: "usr_cmendoza",
    status: "TODO",
    origin: "PLAYBOOK",
    dueAt: new Date(DEMO_NOW.getTime() + 14 * HOUR_MS).toISOString(),
    completedAt: null,
    priorityBand: "HIGH",
    plantCode: "IN01",
  },
  {
    id: "actn_105",
    caseId: "case_qo_2026_004115",
    caseNo: "QO-2026-004115",
    caseTitle: "Extrusion line changeover time above standard",
    title: "Run a changeover time study on both shifts",
    description: "Capture five changeovers per shift and isolate the variance drivers.",
    ownerId: "usr_psharma",
    status: "TODO",
    origin: "PLAYBOOK",
    dueAt: new Date(DEMO_NOW.getTime() + 30 * HOUR_MS).toISOString(),
    completedAt: null,
    priorityBand: "HIGH",
    plantCode: "MX01",
  },
  {
    id: "actn_106",
    caseId: "case_qo_2026_004133",
    caseNo: "QO-2026-004133",
    caseTitle: "Safety stock breach on PA66-GF30 resin",
    title: "Reconcile yield loss against the standard scrap rate",
    description: "Determine whether the yield loss is a process shift or a one-off event.",
    ownerId: "usr_tberger",
    status: "BLOCKED",
    origin: "MANUAL",
    dueAt: new Date(DEMO_NOW.getTime() - 20 * HOUR_MS).toISOString(),
    completedAt: null,
    priorityBand: "HIGH",
    plantCode: "DE01",
  },
];

export const NOTIFICATIONS = [
  {
    id: "ntf_1",
    title: "Case escalated to level 2",
    body: "QO-2026-004129 breached SLA with no action progress",
    at: ago(6 * HOUR_MS + 4 * MINUTE_MS),
    unread: true,
    tone: "critical" as const,
  },
  {
    id: "ntf_2",
    title: "Two critical cases unassigned",
    body: "QO-2026-004182 and QO-2026-004141 are awaiting an owner",
    at: ago(2 * HOUR_MS + 57 * MINUTE_MS),
    unread: true,
    tone: "high" as const,
  },
  {
    id: "ntf_3",
    title: "Verification approved",
    body: "Marcus Reinhardt verified QO-2026-004155",
    at: ago(4 * HOUR_MS + 38 * MINUTE_MS),
    unread: true,
    tone: "success" as const,
  },
  {
    id: "ntf_4",
    title: "Every Angle run completed",
    body: "34 signals received · 9 cases created · 25 deduplicated",
    at: ago(27 * HOUR_MS + 3 * MINUTE_MS),
    unread: false,
    tone: "info" as const,
  },
];

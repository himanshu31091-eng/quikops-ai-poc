import { EXCEPTION_META } from "@/src/config/app-config";
import { isOpenStatus } from "@/src/domain/case-status";
import {
  computePlantRollup,
  portfolioCounts,
  worstPlantCode,
} from "@/src/domain/portfolio-metrics";
import type { ActionItem, ActivityEvent, AiExecutiveSummary } from "@/src/domain/types";
import { DEMO_NOW, OTIF_TARGET_PCT } from "@/src/lib/constants";
import { formatHours, formatMoney } from "@/src/lib/format";
import { CASES } from "./cases";
import { EXECUTION_METRICS, OTIF_SERIES_90D } from "./metrics";
import { PLANTS } from "./organisation";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const ago = (ms: number): string => new Date(DEMO_NOW.getTime() - ms).toISOString();

/**
 * Pre-generated at seed time and stored, exactly as the production path does.
 * The Regenerate control issues a live call; the cached version is what renders
 * on load so the dashboard is never waiting on a model.
 */
/**
 * The dashboard's AI executive summary, composed from the live corpus.
 *
 * Previously hand-authored, and every figure in it had drifted: it claimed two
 * unassigned critical cases at Querétaro when there were none and both criticals
 * sat at Ingolstadt, "11 of the 24 open cases" when 19 were open, 89.2% OTIF
 * against a computed 88.5%, and named the wrong largest exposure. Once the
 * Copilot went live it read those same fixtures and contradicted them out loud.
 *
 * Now every number comes from `src/domain/portfolio-metrics.ts` — the same
 * module behind the KPI band, plant health and Execution Analytics — so the
 * summary cannot disagree with the screen it sits on. The narrative shape is
 * still authored; only the facts are derived.
 */
function buildPortfolioSummary(): AiExecutiveSummary {
  const counts = portfolioCounts(CASES, DEMO_NOW);
  const metrics = EXECUTION_METRICS;
  const otif = OTIF_SERIES_90D[OTIF_SERIES_90D.length - 1]?.value ?? 0;
  const otif30dAgo = OTIF_SERIES_90D[OTIF_SERIES_90D.length - 31]?.value ?? otif;

  const open = CASES.filter((item) => isOpenStatus(item.status));
  const worstCode = worstPlantCode(CASES, PLANTS.map((plant) => plant.code), DEMO_NOW);
  const worstPlant = PLANTS.find((plant) => plant.code === worstCode) ?? PLANTS[0]!;
  const worstRollup = computePlantRollup(CASES, worstPlant.code, DEMO_NOW);

  const largest = [...open].sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)[0];
  const largestPlant = PLANTS.find((plant) => plant.code === largest?.plantCode);

  // Suppliers carrying more than one open case — the commercial pattern.
  const bySupplier = new Map<string, { cases: number; maxRecurrence: number }>();
  for (const item of open) {
    if (!item.supplierName) continue;
    const entry = bySupplier.get(item.supplierName) ?? { cases: 0, maxRecurrence: 0 };
    entry.cases += 1;
    entry.maxRecurrence = Math.max(entry.maxRecurrence, item.recurrenceCount);
    bySupplier.set(item.supplierName, entry);
  }
  const repeatSuppliers = [...bySupplier.entries()]
    .filter(([, entry]) => entry.cases > 1)
    .sort((a, b) => b[1].cases - a[1].cases);
  const repeatCaseCount = repeatSuppliers.reduce((sum, [, entry]) => sum + entry.cases, 0);
  const recurringSuppliers = repeatSuppliers
    .filter(([, entry]) => entry.maxRecurrence > 1)
    .map(([name]) => name);

  const unassignedCritical = open.filter(
    (item) => item.ownerId === null && item.priorityBand === "CRITICAL",
  );
  const unownedExposure = open
    .filter((item) => item.ownerId === null)
    .reduce((sum, item) => sum + item.revenueAtRisk, 0);

  const money = (value: number) => formatMoney(value, "USD");

  // What is actually driving the worst site, rather than an assumed cause: the
  // most common exception type among its open cases, and whether that work is
  // mostly supplier-driven or internal.
  const worstOpen = open.filter((item) => item.plantCode === worstPlant.code);
  const dominantType = [...new Set(worstOpen.map((item) => item.exceptionType))].sort(
    (a, b) =>
      worstOpen.filter((item) => item.exceptionType === b).length -
      worstOpen.filter((item) => item.exceptionType === a).length,
  )[0];
  const repeatAtWorst = worstOpen.filter((item) => item.recurrenceCount > 1).length;

  return {
    id: "ai_exec_20260805",
    headline: `${worstPlant.name} is the weakest site in the network${
      dominantType ? `, driven by ${EXCEPTION_META[dominantType].label.toLowerCase()}` : ""
    }${
      repeatAtWorst > 0
        ? ` — and ${repeatAtWorst} of its ${worstOpen.length} open cases are repeat detections rather than new disruptions.`
        : `, all of it first-time detections rather than recurring failure.`
    }`,
    paragraphs: [
      `Group on-time-in-full is running at ${otif.toFixed(1)}%, ${(OTIF_TARGET_PCT - otif).toFixed(1)} points below the ${OTIF_TARGET_PCT}% target and ${Math.abs(otif - otif30dAgo).toFixed(1)} points ${otif >= otif30dAgo ? "up" : "down"} across the last 30 days. ${worstPlant.name} carries ${worstRollup.openCases} open case${worstRollup.openCases === 1 ? "" : "s"} against ${worstRollup.slaAdherencePct.toFixed(1)}% SLA adherence, the lowest of the ${PLANTS.length} sites.`,
      // The case title is used verbatim rather than lower-cased: it contains
      // proper nouns, and "against August plan" became "against august plan".
      largest
        ? `The largest single exposure is ${largest.caseNo} — ${largest.title} — at ${largestPlant?.name ?? largest.plantCode}, carrying ${money(largest.revenueAtRisk)} of revenue at risk${largest.customerTier === "TIER_1" ? " against a tier-one customer" : ""}. ${largest.recurrenceCount > 1 ? `This is detection ${largest.recurrenceCount} against the same material and source, which points at an unresolved root cause rather than a fresh incident.` : "It is a first detection against this combination."}`
        : "No open cases carry revenue exposure at present.",
      `Across the network ${counts.open} case${counts.open === 1 ? " is" : "s are"} open carrying ${money(counts.revenueAtRisk)}, of which ${counts.breached} ${counts.breached === 1 ? "has" : "have"} passed their resolution target and ${counts.unassigned} ${counts.unassigned === 1 ? "has" : "have"} no owner. Mean time to resolve is ${formatHours(metrics.mttrHours)}, ${Math.abs(metrics.mttrDeltaPct)}% ${metrics.mttrDeltaPct < 0 ? "faster" : "slower"} quarter-on-quarter, and the verification pass rate is holding at ${metrics.verificationPassRatePct.toFixed(1)}%.`,
    ],
    callouts: [
      {
        label: "Immediate",
        detail:
          unassignedCritical.length > 0
            ? `${unassignedCritical.length} critical case${unassignedCritical.length === 1 ? " is" : "s are"} unassigned, together carrying ${money(unassignedCritical.reduce((sum, item) => sum + item.revenueAtRisk, 0))} of revenue at risk.`
            : `${counts.unassigned} open case${counts.unassigned === 1 ? " has" : "s have"} no owner, together carrying ${money(unownedExposure)}. None are critical, but unowned work is not being executed.`,
        tone: "critical",
      },
      {
        label: "Recurring",
        detail:
          repeatSuppliers.length > 0
            ? `${repeatSuppliers.length} supplier${repeatSuppliers.length === 1 ? "" : "s"} account for ${repeatCaseCount} of the ${counts.open} open cases${
                recurringSuppliers.length > 0
                  ? `, and ${recurringSuppliers.join(" and ")} ${recurringSuppliers.length === 1 ? "has" : "have"} recurred more than once`
                  : ", none of them recurring"
              }.`
            : `No supplier carries more than one open case; the exposure is distributed rather than concentrated.`,
        tone: "high",
      },
      {
        label: "Improving",
        detail: `Verification pass rate is holding at ${metrics.verificationPassRatePct.toFixed(1)}% and mean time to resolve is down ${Math.abs(metrics.mttrDeltaPct)}% quarter-on-quarter to ${formatHours(metrics.mttrHours)}.`,
        tone: "success",
      },
    ],
    // Cited cases are chosen by exposure, so the chips always point at the
    // cases the paragraphs above actually discuss.
    citations: [
      ...[...open]
        .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
        .slice(0, 3)
        .map((item) => ({
          type: "case" as const,
          ref: item.caseNo,
          label: `${EXCEPTION_META[item.exceptionType].label} — ${
            PLANTS.find((plant) => plant.code === item.plantCode)?.name ?? item.plantCode
          }`,
        })),
      {
        type: "kpi_snapshot" as const,
        ref: `${worstPlant.code}/OTIF_PCT/2026-08-04`,
        label: `${worstPlant.code} OTIF baseline`,
      },
    ],
    model: "claude-opus-5",
    promptVersion: "exec-summary.v2",
    generatedAt: ago(52 * MINUTE_MS),
    scope: `All plants · ${counts.open} open cases`,
  };
}

export const EXECUTIVE_SUMMARY: AiExecutiveSummary = buildPortfolioSummary();

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

import { EXCEPTION_META, KPI_LABEL } from "@/src/config/app-config";
import { scoreCaseHealth } from "@/src/domain/case-health";
import { statusGroupOf } from "@/src/domain/case-status";
import type {
  ActionStatus,
  CaseAuditEntry,
  CaseComment,
  CaseEvidence,
  CaseExecutiveSummary,
  CaseHealth,
  CaseInformation,
  CaseListItem,
  CaseTimelineEvent,
  CorrectiveAction,
  ExceptionType,
  User,
  VerificationRecord,
} from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatMoney, formatPercent } from "@/src/lib/format";
import { TODAYS_ACTIONS } from "./intelligence";
import { USER_BY_ID, USERS } from "./organisation";

/**
 * Case execution records.
 *
 * There is no second dataset here: every timeline event, corrective action,
 * evidence file, comment and audit row below is derived from the case's own
 * seeded fields — its status, owner, opened and due dates, action counts,
 * recurrence and exception type. The same case always produces the same
 * record, and a case that never reached verification never has a verification
 * event. When Neon is connected these tables are read rather than derived; the
 * shapes are identical, so nothing above this file changes.
 */

const HOUR_MS = 3_600_000;

const plusHours = (from: string, hours: number): string =>
  new Date(new Date(from).getTime() + hours * HOUR_MS).toISOString();

/** A point between two timestamps — used to place events inside a case's life. */
const between = (from: string, to: string, ratio: number): string =>
  new Date(
    new Date(from).getTime() + (new Date(to).getTime() - new Date(from).getTime()) * ratio,
  ).toISOString();

/* ------------------------------------------------------------ Reference data */

/** Production line by material. Seeded from the plant asset register. */
const PRODUCTION_LINE: Record<string, string> = {
  "RM-4471": "Extrusion line 1",
  "RM-2210": "Assembly line 3",
  "SA-1190": "Press line 2",
  "SA-3045": "CNC cell 7",
  "RM-9902": "Rotor assembly line",
  "RM-8834": "Harness cell 4",
  "RM-5502": "Moulding line B",
  "RM-7318": "Seal kitting line",
};

/**
 * Order references. Where the case description already names a purchase or
 * sales order, that number is used verbatim so the two never disagree.
 */
const ORDER_REF: Record<string, { ref: string; type: CaseInformation["orderType"] }> = {
  // Keyed to the current corpus. The hero case reuses the purchase order it was
  // raised from, so the order reference on Case Information and the source record
  // on the lineage panel are the same document rather than two numbers.
  "QO-PA-2026-00421": { ref: "PO-PA-45821", type: "PURCHASE_ORDER" },
  "QO-PA-2026-00418": { ref: "PO-PA-45903", type: "PURCHASE_ORDER" },
  "QO-PA-2026-00412": { ref: "PO-PA-45774", type: "PURCHASE_ORDER" },
  "QO-PA-2026-00406": { ref: "WO-PA-11255", type: "WORK_ORDER" },
  "QO-PA-2026-00400": { ref: "PO-PA-45610", type: "PURCHASE_ORDER" },
  "QO-PA-2026-00367": { ref: "PO-PA-45688", type: "PURCHASE_ORDER" },
  "QO-PA-2026-00313": { ref: "PO-PA-45402", type: "PURCHASE_ORDER" },
  "QO-PA-2026-00292": { ref: "WO-PA-11090", type: "WORK_ORDER" },
};

const RISK_CATEGORY: Record<ExceptionType, string> = {
  VENDOR_DELAY: "Supply continuity",
  MATERIAL_SHORTAGE: "Supply continuity",
  CAPACITY_CONSTRAINT: "Capacity and throughput",
  QUALITY_HOLD: "Quality and compliance",
  INVENTORY_EXCESS: "Working capital",
  INVENTORY_STOCKOUT: "Supply continuity",
  PLANNING_DEVIATION: "Planning integrity",
  DELIVERY_AT_RISK: "Delivery performance",
  OTHER: "Operational",
};

/** The detection rule that raised each class of case. */
const DETECTION_RULE: Record<
  ExceptionType,
  { id: string; name: string; detail: string }
> = {
  VENDOR_DELAY: {
    id: "RULE-VD-002",
    name: "Vendor confirmed date slip",
    detail:
      "Fires when a confirmed purchase order date moves out by more than 3 days, or the goods receipt is more than 2 days past the confirmed date, on a material with open demand inside the horizon.",
  },
  MATERIAL_SHORTAGE: {
    id: "RULE-MS-001",
    name: "Coverage below safety stock",
    detail:
      "Fires when projected days of coverage fall below the material's safety stock policy with confirmed demand still open in the same window.",
  },
  CAPACITY_CONSTRAINT: {
    id: "RULE-CC-004",
    name: "Load exceeds available capacity",
    detail:
      "Fires when confirmed order load on a work centre exceeds available capacity by more than 5% for two consecutive planning weeks.",
  },
  QUALITY_HOLD: {
    id: "RULE-QH-003",
    name: "Inspection rejection with open demand",
    detail:
      "Fires when an inspection lot is rejected or a control characteristic breaches its tolerance band while the material has confirmed demand inside the horizon.",
  },
  INVENTORY_EXCESS: {
    id: "RULE-IE-002",
    name: "Stock without forward demand",
    detail:
      "Fires when on-hand quantity exceeds forward demand across the full planning horizon and the carrying value crosses the write-down threshold.",
  },
  INVENTORY_STOCKOUT: {
    id: "RULE-IS-001",
    name: "Projected balance turns negative",
    detail:
      "Fires when the projected available balance goes negative inside the replenishment lead time for a material with no qualified alternate.",
  },
  PLANNING_DEVIATION: {
    id: "RULE-PD-005",
    name: "Plan diverges from executable reality",
    detail:
      "Fires when the released plan and the executable position diverge — a superseded component, an unrefreshed netting run, or a sequence that services lower-value demand first.",
  },
  DELIVERY_AT_RISK: {
    id: "RULE-DR-001",
    name: "Shipment outside agreed window",
    detail:
      "Fires when a confirmed shipment's projected arrival falls outside the customer's agreed delivery window with no recovery booked.",
  },
  OTHER: {
    id: "RULE-GEN-001",
    name: "General operational exception",
    detail: "Fires on an operational condition outside the specialised rule set.",
  },
};

/* ------------------------------------------------------------------ Reviewer */

/**
 * Verification is separated from execution: the reviewer is never the owner.
 * The plant's own operations manager reviews where one exists, otherwise the
 * VP of Global Operations does.
 */
/**
 * English ordinal. A naive `${n}th` produced "the 3th detection" on the golden
 * case — the first thing a client reads on the most-demonstrated record.
 */
function ordinal(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th";
  return `${value}${suffix}`;
}

export function reviewerFor(item: CaseListItem): User {
  const plantManager = USERS.find(
    (user) =>
      user.role === "OPS_MANAGER" &&
      user.plantScope.length === 1 &&
      user.plantScope[0] === item.plantCode &&
      user.id !== item.ownerId,
  );
  const fallback = USER_BY_ID.usr_ndeshpande!;
  if (plantManager) return plantManager;
  return item.ownerId === fallback.id
    ? (USERS.find((u) => u.role === "OPS_MANAGER" && u.id !== item.ownerId) ?? fallback)
    : fallback;
}

/* ------------------------------------------------------- Executive summary */

const impactVerb: Record<ExceptionType, string> = {
  VENDOR_DELAY: "supplier is not delivering to the confirmed date",
  MATERIAL_SHORTAGE: "material coverage has fallen below policy",
  CAPACITY_CONSTRAINT: "the work centre cannot absorb the confirmed load",
  QUALITY_HOLD: "material is quarantined pending disposition",
  INVENTORY_EXCESS: "stock is held against demand that no longer exists",
  INVENTORY_STOCKOUT: "the projected balance turns negative inside lead time",
  PLANNING_DEVIATION: "the released plan no longer matches what can be executed",
  DELIVERY_AT_RISK: "a confirmed shipment will miss its delivery window",
  OTHER: "an operational condition needs resolution",
};

const ROOT_CAUSE: Record<
  ExceptionType,
  { text: string; confidence: CaseExecutiveSummary["rootCauseConfidence"] }
> = {
  VENDOR_DELAY: {
    text: "Supplier capacity, not transport. Delay duration has grown on each detection while shipment transit times have held, which points at the vendor's own production schedule rather than the lane.",
    confidence: "PROBABLE",
  },
  MATERIAL_SHORTAGE: {
    text: "Consumption ran ahead of the replenishment signal. The reorder point was set against a demand profile that has since shifted, so the trigger fired too late to cover the lead time.",
    confidence: "CONFIRMED",
  },
  CAPACITY_CONSTRAINT: {
    text: "Available hours were lost to unplanned maintenance and changeover overrun, while the released order load was not re-levelled against the reduced capacity.",
    confidence: "CONFIRMED",
  },
  QUALITY_HOLD: {
    text: "A process characteristic drifted outside its control band. Incoming inspection caught it at the boundary, so the escape is contained to the quarantined lot.",
    confidence: "PROBABLE",
  },
  INVENTORY_EXCESS: {
    text: "An engineering change superseded the part without a corresponding stock disposition, leaving the pre-change variant on hand with no forward demand.",
    confidence: "CONFIRMED",
  },
  INVENTORY_STOCKOUT: {
    text: "Single-sourced material with a lead time longer than the coverage buffer. Any yield loss or demand pull-in exhausts the balance before replenishment lands.",
    confidence: "CONFIRMED",
  },
  PLANNING_DEVIATION: {
    text: "A master data or sequencing change was released without a planning refresh, so the netting run resolved against a position that no longer holds.",
    confidence: "PROBABLE",
  },
  DELIVERY_AT_RISK: {
    text: "Outbound execution, not production. The material was available on time; the loss is in consolidation, carrier capacity or documentation.",
    confidence: "UNDER_INVESTIGATION",
  },
  OTHER: {
    text: "Under investigation by the case owner.",
    confidence: "UNDER_INVESTIGATION",
  },
};

export function buildExecutiveSummary(item: CaseListItem): CaseExecutiveSummary {
  const exception = EXCEPTION_META[item.exceptionType];
  const rule = DETECTION_RULE[item.exceptionType];
  const rootCause = ROOT_CAUSE[item.exceptionType];
  const deviation = Math.max(item.targetValue - item.baselineValue, 0);
  const material = item.materialCode
    ? `${item.materialCode}${item.materialDesc ? ` (${item.materialDesc})` : ""}`
    : "the affected material";

  return {
    problem: item.description,
    businessImpact: `${formatMoney(item.revenueAtRisk, item.currency)} of revenue is exposed at ${
      item.plant.name
    }${
      item.customerName ? ` against ${item.customerName}` : " across the order book"
    }. The case carries a priority score of ${item.priorityScore.toFixed(
      1,
    )} out of 100, placing it in the ${item.priorityBand.toLowerCase()} band.`,
    operationalImpact: `At ${item.plant.name} the ${exception.label.toLowerCase()} means ${
      impactVerb[item.exceptionType]
    }. ${material} is affected on ${
      PRODUCTION_LINE[item.materialCode ?? ""] ?? "the affected line"
    }.`,
    rootCause: rootCause.text,
    rootCauseConfidence: rootCause.confidence,
    customerImpact: item.customerName
      ? `${item.customerName} is a ${
          item.customerTier ? item.customerTier.replace("_", " ").toLowerCase() : "listed"
        } account. ${
          item.priorityBand === "CRITICAL" || item.priorityBand === "HIGH"
            ? "A miss here is visible to the customer and enters their supplier scorecard."
            : "No customer notification has been required so far."
        }`
      : "No customer order is directly exposed. The impact is carried internally as cost and working capital.",
    revenueImpact: `${formatMoney(
      item.revenueAtRisk,
      item.currency,
    )} at risk, measured as the value of confirmed demand that cannot be served if the condition is not cleared before the promised date.`,
    targetKpi: `${KPI_LABEL[item.kpiKey]} — currently ${
      item.baselineValue
    } against a target of ${item.targetValue}${
      deviation > 0 ? `, a gap of ${formatPercent(deviation)}` : ""
    }. Closure is measured over a ${item.measurementWindowDays}-day window.`,
    detectionRule: `${rule.id} · ${rule.name}`,
    whyRaised: `The enterprise data platform evaluated ${rule.id} against the ${
      item.plantCode
    } dataset and the condition held. ${rule.detail}${
      item.recurrenceCount > 1
        ? ` This is detection ${item.recurrenceCount} against the same material and source, so the case was escalated rather than opened fresh.`
        : " No prior detection exists against this material and source, so a new case was opened."
    }`,
  };
}

/* -------------------------------------------------------- Case information */

export function buildCaseInformation(item: CaseListItem): CaseInformation {
  const rule = DETECTION_RULE[item.exceptionType];
  const order = ORDER_REF[item.caseNo] ?? { ref: "—", type: "WORK_ORDER" as const };
  const opened = new Date(item.openedAt);
  const signalDate = `${opened.getUTCFullYear()}-${String(opened.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(opened.getUTCDate()).padStart(2, "0")}`;

  return {
    productionLine: PRODUCTION_LINE[item.materialCode ?? ""] ?? "Not line-specific",
    orderRef: order.ref,
    orderType: order.type,
    riskCategory: RISK_CATEGORY[item.exceptionType],
    detectionRuleId: rule.id,
    detectionRuleName: rule.name,
    detectionRuleDetail: rule.detail,
    signalRef: `SIG-${signalDate}-${item.plant.countryCode}-${item.caseNo.split("-").pop()}`,
  };
}

/* -------------------------------------------------------- Corrective actions */

/** Playbook steps by exception type, in the order a competent owner works them. */
const PLAYBOOK_STEPS: Record<ExceptionType, { title: string; description: string }[]> = {
  VENDOR_DELAY: [
    {
      title: "Confirm the revised date in writing with the supplier",
      description:
        "Obtain a written commitment for the new date and the quantity split, and record who at the supplier gave it.",
    },
    {
      title: "Quantify the coverage gap against confirmed demand",
      description:
        "Net the revised receipt against open demand and identify which orders are exposed and by how many days.",
    },
    {
      title: "Price the expedite options",
      description:
        "Compare air freight, partial shipment and an alternate source on cost, lead time and qualification risk.",
    },
    {
      title: "Escalate to supplier account management",
      description:
        "Raise the repeat miss with the vendor's commercial lead and request a capacity commitment in writing.",
    },
    {
      title: "Update the supplier scorecard and review the sourcing position",
      description:
        "Record the miss against on-time delivery and flag the material for dual-sourcing review.",
    },
    {
      title: "Confirm recovery and close the exposure",
      description:
        "Verify the goods receipt against the revised commitment and confirm no customer order was missed.",
    },
  ],
  MATERIAL_SHORTAGE: [
    {
      title: "Verify on-hand against the physical count",
      description:
        "Confirm the system balance matches the floor before acting on it — a phantom shortage costs more than it saves.",
    },
    {
      title: "Confirm alternate supplier lead time in writing",
      description:
        "Obtain written confirmation of lead time and quantity from the qualified alternate source.",
    },
    {
      title: "Re-sequence the build to protect confirmed orders",
      description:
        "Move the constrained material to the orders with the earliest promised dates and the highest tier.",
    },
    {
      title: "Raise the expedite and confirm freight mode",
      description: "Place the expedite request and confirm the freight mode and arrival date.",
    },
    {
      title: "Reset the reorder point against the current demand profile",
      description:
        "Recalculate the trigger so the same coverage gap does not reopen inside the lead time.",
    },
    {
      title: "Verify coverage restored over the measurement window",
      description:
        "Confirm days of coverage are back above policy and hold for the full window before closing.",
    },
  ],
  CAPACITY_CONSTRAINT: [
    {
      title: "Quantify the shortfall by week and work centre",
      description:
        "Express the gap in available hours per planning week so the recovery option can be sized against it.",
    },
    {
      title: "Model a weekend shift against the shortfall",
      description:
        "Quantify the capacity recovered by adding a Saturday shift and the incremental labour cost.",
    },
    {
      title: "Run a changeover time study on both shifts",
      description:
        "Capture five changeovers per shift and isolate the variance drivers against the standard.",
    },
    {
      title: "Re-level the released load against available capacity",
      description:
        "Move non-critical orders out of the constrained weeks and protect the confirmed tier-one demand.",
    },
    {
      title: "Confirm the recovery plan with production management",
      description:
        "Get the shift pattern and re-levelled sequence signed off before committing to customers.",
    },
    {
      title: "Verify schedule adherence over the measurement window",
      description:
        "Confirm adherence has recovered against target and held for the full window.",
    },
  ],
  QUALITY_HOLD: [
    {
      title: "Contain the lot and confirm the quarantine quantity",
      description:
        "Physically segregate the affected quantity and confirm nothing has been consumed downstream.",
    },
    {
      title: "Re-test against the specification with a full sample plan",
      description:
        "Run the full sample plan rather than the reduced one, and record every reading against the tolerance band.",
    },
    {
      title: "Obtain the supplier disposition and corrective action",
      description:
        "Require a written disposition and an 8D or equivalent corrective action from the supplier.",
    },
    {
      title: "Assess downstream exposure and customer notification",
      description:
        "Determine whether any affected material reached a customer and whether notification is required.",
    },
    {
      title: "Release, rework or reject the lot",
      description:
        "Record the disposition decision, who approved it, and the quantity in each outcome.",
    },
    {
      title: "Verify the process is back in control",
      description:
        "Confirm the control characteristic has held inside the band across the measurement window.",
    },
  ],
  INVENTORY_EXCESS: [
    {
      title: "Confirm there is no forward demand across the horizon",
      description:
        "Check the full planning horizon and any service or spares demand before disposing of stock.",
    },
    {
      title: "Test internal reuse and engineering deviation",
      description:
        "Establish whether the superseded variant can be consumed under a temporary engineering deviation.",
    },
    {
      title: "Obtain secondary market and scrap valuations",
      description:
        "Get at least two quotes so the recovery rate can be defended at quarter end.",
    },
    {
      title: "Approve the disposition and record the write-down",
      description:
        "Route the disposition for financial approval and record the recovered value against carrying value.",
    },
    {
      title: "Close the loop with engineering change control",
      description:
        "Ensure future change notices carry a stock disposition step so the exposure does not recur.",
    },
    {
      title: "Verify inventory days back within policy",
      description: "Confirm inventory days have returned to the target band and held.",
    },
  ],
  INVENTORY_STOCKOUT: [
    {
      title: "Confirm the projected balance and the date it turns negative",
      description:
        "Validate the projection against firm receipts and firm demand, not forecast.",
    },
    {
      title: "Raise an expedite against the open purchase order",
      description:
        "Request a pull-in on the open order and confirm the freight mode and revised arrival.",
    },
    {
      title: "Qualify or confirm an alternate source",
      description:
        "Identify whether a qualified alternate exists and what the qualification lead time would be.",
    },
    {
      title: "Protect the highest-value demand in the build sequence",
      description:
        "Sequence the remaining balance against tier-one confirmed orders first.",
    },
    {
      title: "Reset safety stock against the true lead time",
      description:
        "Recalculate the buffer using the demonstrated lead time rather than the contracted one.",
    },
    {
      title: "Verify coverage restored and holding",
      description: "Confirm coverage is above policy across the measurement window.",
    },
  ],
  PLANNING_DEVIATION: [
    {
      title: "Identify every order netted against the stale position",
      description:
        "List the demand that resolved against the superseded component or the outdated sequence.",
    },
    {
      title: "Correct the master data and re-run the planning refresh",
      description:
        "Fix the underlying record, then re-run netting and confirm the new plan is executable.",
    },
    {
      title: "Reconcile the forecast bias against actual consumption",
      description:
        "Quantify the bias by period so the correction can be applied to the rolling forecast.",
    },
    {
      title: "Re-sequence production against confirmed ship dates",
      description:
        "Order the sequence by promised date and customer tier, not by finite scheduling default.",
    },
    {
      title: "Add a release gate to the change process",
      description:
        "Require a planning refresh before a bill of materials revision can be released.",
    },
    {
      title: "Verify forecast accuracy over the measurement window",
      description:
        "Confirm accuracy has recovered against target across the full window.",
    },
  ],
  DELIVERY_AT_RISK: [
    {
      title: "Confirm the exact orders and quantities exposed",
      description:
        "List the sales orders, quantities and agreed delivery windows that are at risk.",
    },
    {
      title: "Secure alternate carrier or routing capacity",
      description:
        "Obtain spot capacity or an alternate routing and record the premium against the exposure.",
    },
    {
      title: "Clear the documentation or customs blocker",
      description:
        "Correct the certificate, declaration or paperwork holding the shipment and confirm release.",
    },
    {
      title: "Agree a revised delivery commitment with the customer",
      description:
        "Where the window cannot be held, agree the revised date before it is missed, not after.",
    },
    {
      title: "Record the root cause against the lane",
      description:
        "Log the cause against the outbound lane so repeat exposure is visible in the next review.",
    },
    {
      title: "Verify the delivery landed inside the agreed window",
      description: "Confirm proof of delivery against the agreed date and close the exposure.",
    },
  ],
  OTHER: [
    {
      title: "Establish the facts and confirm the exposure",
      description: "Document what was observed, what is exposed and what has been tried.",
    },
    {
      title: "Agree the corrective approach with the reviewer",
      description: "Confirm the approach before committing effort or cost.",
    },
    {
      title: "Execute the correction",
      description: "Carry out the agreed correction and record the outcome.",
    },
    {
      title: "Verify the condition has cleared",
      description: "Confirm the measured KPI has recovered across the window.",
    },
  ],
};

/** Progress reported against an action, by the state it is in. */
const COMPLETION_BY_STATUS: Record<ActionStatus, number> = {
  DONE: 100,
  IN_PROGRESS: 55,
  BLOCKED: 30,
  TODO: 0,
  CANCELLED: 0,
};

export function buildCorrectiveActions(item: CaseListItem): CorrectiveAction[] {
  const total = item.totalActionCount;
  if (total === 0) return [];

  // Actions already seeded for the shared Today's Work list are the real ones —
  // reuse them so My Work and the case never show a different title for the
  // same piece of work.
  const seeded = TODAYS_ACTIONS.filter((action) => action.caseId === item.id);
  const steps = PLAYBOOK_STEPS[item.exceptionType];
  const openTarget = item.openActionCount;
  const owner = item.ownerId ?? "usr_aiyer";

  const actions: CorrectiveAction[] = [];

  for (let index = 0; index < total; index += 1) {
    const seededAction = seeded[index];
    const step = steps[index % steps.length]!;
    // Completed work sits at the top of the list; open work follows in order.
    const isOpen = index >= total - openTarget;

    const status: ActionStatus = seededAction
      ? seededAction.status
      : isOpen
        ? index === total - openTarget
          ? "IN_PROGRESS"
          : "TODO"
        : "DONE";

    const dueAt = between(
      item.assignedAt ?? item.openedAt,
      item.dueAt,
      total === 1 ? 0.8 : 0.3 + (0.65 * index) / Math.max(total - 1, 1),
    );

    actions.push({
      id: seededAction?.id ?? `actn_${item.caseNo.slice(-6)}_${index + 1}`,
      caseId: item.id,
      caseNo: item.caseNo,
      caseTitle: item.title,
      title: seededAction?.title ?? step.title,
      description: seededAction?.description ?? step.description,
      ownerId: seededAction?.ownerId ?? owner,
      status,
      origin: seededAction?.origin ?? (item.playbookId ? "PLAYBOOK" : "AI_SUGGESTED"),
      dueAt: seededAction?.dueAt ?? dueAt,
      completedAt:
        status === "DONE"
          ? (seededAction?.completedAt ?? between(item.openedAt, item.dueAt, 0.25 + index * 0.1))
          : null,
      priorityBand: item.priorityBand,
      plantCode: item.plantCode,
      completionPct: COMPLETION_BY_STATUS[status],
      notes:
        status === "DONE"
          ? "Completed and evidenced. Reviewed against the acceptance criteria."
          : status === "BLOCKED"
            ? "Blocked pending input from the supplier. Chased twice."
            : status === "IN_PROGRESS"
              ? "In progress. Interim findings recorded against the case."
              : "Not started.",
      evidenceCount: status === "DONE" ? 1 : 0,
    });
  }

  return actions;
}

/* ------------------------------------------------------------------ Evidence */

const EVIDENCE_TEMPLATES: {
  kind: CaseEvidence["kind"];
  suffix: string;
  sizeBytes: number;
  description: string;
}[] = [
  {
    kind: "PDF",
    suffix: "supplier-confirmation.pdf",
    sizeBytes: 214_338,
    description: "Written confirmation of the revised commitment, signed by the supplier.",
  },
  {
    kind: "SPREADSHEET",
    suffix: "coverage-analysis.xlsx",
    sizeBytes: 88_104,
    description: "Netting of the revised receipt against open demand, by order and date.",
  },
  {
    kind: "IMAGE",
    suffix: "line-condition.png",
    sizeBytes: 1_284_770,
    description: "Photograph taken at the line showing the condition at the time of detection.",
  },
  {
    kind: "DOCUMENT",
    suffix: "corrective-action-report.docx",
    sizeBytes: 156_902,
    description: "Corrective action report covering containment, cause and preventive measures.",
  },
  {
    kind: "SPREADSHEET",
    suffix: "measurement-window.xlsx",
    sizeBytes: 64_512,
    description: "KPI readings across the measurement window, used to support verification.",
  },
  {
    kind: "NOTE",
    suffix: "floor-walk-notes.txt",
    sizeBytes: 4_096,
    description: "Notes captured during the floor walk with the shift lead.",
  },
];

export function buildEvidence(
  item: CaseListItem,
  actions: CorrectiveAction[],
): CaseEvidence[] {
  const owner = item.ownerId ? USER_BY_ID[item.ownerId] : null;
  const evidence: CaseEvidence[] = [];
  const group = statusGroupOf(item.status);
  const terminal = group === "VERIFIED" || group === "CLOSED";

  // Every case carries the detection extract the signal was raised from.
  evidence.push({
    id: `evd_${item.caseNo.slice(-6)}_signal`,
    caseId: item.id,
    fileName: `${item.caseNo}-signal-extract.pdf`,
    kind: "PDF",
    sizeBytes: 132_664,
    uploadedById: "system",
    uploadedByName: "Enterprise Data Platform",
    uploadedAt: item.openedAt,
    description: `Signal extract for ${
      DETECTION_RULE[item.exceptionType].id
    }, including the evaluated dataset and the values that met the rule.`,
    actionId: null,
    accepted: true,
  });

  const completed = actions.filter((action) => action.status === "DONE");
  completed.forEach((action, index) => {
    const template = EVIDENCE_TEMPLATES[index % EVIDENCE_TEMPLATES.length]!;
    evidence.push({
      id: `evd_${item.caseNo.slice(-6)}_${index + 1}`,
      caseId: item.id,
      fileName: `${item.caseNo.toLowerCase()}-${template.suffix}`,
      kind: template.kind,
      sizeBytes: template.sizeBytes,
      uploadedById: action.ownerId,
      uploadedByName: USER_BY_ID[action.ownerId]?.name ?? owner?.name ?? "Case owner",
      uploadedAt: action.completedAt ?? item.openedAt,
      description: template.description,
      actionId: action.id,
      accepted: terminal,
    });
  });

  return evidence.sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  );
}

/* ------------------------------------------------------------------ Comments */

export function buildComments(item: CaseListItem): CaseComment[] {
  const owner = item.ownerId ? USER_BY_ID[item.ownerId] : null;
  const reviewer = reviewerFor(item);
  const analyst = USER_BY_ID.usr_agupta!;
  const group = statusGroupOf(item.status);
  const comments: CaseComment[] = [];

  const subject =
    item.supplierName ?? item.customerName ?? item.materialDesc ?? "the affected material";

  comments.push({
    id: `cmt_${item.caseNo.slice(-6)}_1`,
    caseId: item.id,
    parentId: null,
    authorId: analyst.id,
    authorName: analyst.name,
    authorRole: analyst.role,
    body: `Pulled the history on ${subject}. ${
      item.recurrenceCount > 1
        ? `This is the ${ordinal(item.recurrenceCount)} detection in the current window — the interval between detections is shortening, which usually means the underlying condition was never actually cleared.`
        : "No prior detection against this combination in the last 90 days, so treating it as a first occurrence."
    } @${owner?.name ?? reviewer.name} the numbers behind the priority score are on the case if you want to sanity-check the weighting.`,
    at: plusHours(item.openedAt, 3.5),
    mentions: [owner?.id ?? reviewer.id],
    attachments: [],
  });

  if (owner) {
    comments.push({
      id: `cmt_${item.caseNo.slice(-6)}_2`,
      caseId: item.id,
      parentId: `cmt_${item.caseNo.slice(-6)}_1`,
      authorId: owner.id,
      authorName: owner.name,
      authorRole: owner.role,
      body:
        item.recurrenceCount > 1
          ? `Agreed. I am treating the previous closure as incomplete rather than opening this as new — the corrective action did not hold. Working the escalation path this time.`
          : `Thanks. Working the playbook now. Will have the coverage position confirmed before the end of shift.`,
      at: plusHours(item.openedAt, 6),
      mentions: [],
      attachments: [],
    });
  }

  if (group === "WAITING_VERIFICATION" || group === "VERIFIED" || group === "CLOSED") {
    comments.push({
      id: `cmt_${item.caseNo.slice(-6)}_3`,
      caseId: item.id,
      parentId: null,
      authorId: owner?.id ?? reviewer.id,
      authorName: owner?.name ?? reviewer.name,
      authorRole: owner?.role ?? reviewer.role,
      body: `All corrective actions are complete and evidenced. Submitting for verification — @${reviewer.name} the measurement window readings are attached against the last action.`,
      at: between(item.openedAt, item.dueAt, 0.85),
      mentions: [reviewer.id],
      attachments: [
        {
          id: `att_${item.caseNo.slice(-6)}_1`,
          name: `${item.caseNo.toLowerCase()}-measurement-window.xlsx`,
          kind: "SPREADSHEET",
        },
      ],
    });
  }

  if (group === "VERIFIED" || group === "CLOSED") {
    comments.push({
      id: `cmt_${item.caseNo.slice(-6)}_4`,
      caseId: item.id,
      parentId: `cmt_${item.caseNo.slice(-6)}_3`,
      authorId: reviewer.id,
      authorName: reviewer.name,
      authorRole: reviewer.role,
      body: `Reviewed. Evidence covers the full window and the KPI recovered against target. Approved — good work on getting the root cause rather than just clearing the symptom.`,
      at: item.verifiedAt ?? between(item.openedAt, item.dueAt, 0.92),
      mentions: [],
      attachments: [],
    });
  }

  return comments;
}

/* ------------------------------------------------------------- Verification */

export function buildVerification(
  item: CaseListItem,
  actions: CorrectiveAction[],
): VerificationRecord | null {
  const group = statusGroupOf(item.status);
  if (group !== "WAITING_VERIFICATION" && group !== "VERIFIED" && group !== "CLOSED") {
    return null;
  }

  const reviewer = reviewerFor(item);
  const owner = item.ownerId ? USER_BY_ID[item.ownerId] : null;
  const requestedAt = between(item.openedAt, item.dueAt, 0.85);
  const decided = group === "VERIFIED" || group === "CLOSED";
  const recovered =
    item.targetValue >= item.baselineValue
      ? item.baselineValue + (item.targetValue - item.baselineValue) * 1.02
      : item.baselineValue - (item.baselineValue - item.targetValue) * 1.02;

  return {
    id: `ver_${item.caseNo.slice(-6)}`,
    caseId: item.id,
    requestedById: owner?.id ?? reviewer.id,
    requestedByName: owner?.name ?? reviewer.name,
    requestedAt,
    reviewerId: reviewer.id,
    reviewerName: reviewer.name,
    decision: decided ? "APPROVED" : null,
    decidedAt: decided ? (item.verifiedAt ?? plusHours(requestedAt, 18)) : null,
    comment: decided
      ? "Evidence covers the full measurement window and the KPI recovered against target. Root cause addressed rather than contained. Approved."
      : "",
    notes: decided
      ? `Checked ${actions.filter((a) => a.status === "DONE").length} completed actions against their acceptance criteria, confirmed the KPI readings across the ${item.measurementWindowDays}-day window, and verified no customer order was missed.`
      : `Awaiting review. ${actions.filter((a) => a.status === "DONE").length} of ${
          actions.length
        } actions complete.`,
    kpiKey: item.kpiKey,
    kpiBaseline: item.baselineValue,
    /**
     * The reading so far.
     *
     * A decided case reports the value the reviewer signed off. A case still
     * inside its measurement window reports an **interim** reading — the KPI has
     * moved, the window has not closed, and nobody has judged it yet. Reporting
     * `null` there was wrong in a way that mattered: it made a case with real
     * movement look unmeasured, and left the reviewer with nothing to weigh.
     *
     * Interim is placed part-way from baseline toward target rather than at it,
     * because a window that has not closed has not proved the target was met.
     */
    kpiCurrent: decided
      ? Math.round(recovered * 10) / 10
      : Math.round(
          (item.baselineValue + (item.targetValue - item.baselineValue) * 0.625) * 10,
        ) / 10,
    kpiTarget: item.targetValue,
    measurementWindowDays: item.measurementWindowDays,
  };
}

/* -------------------------------------------------------------- Timeline */

export function buildTimeline(
  item: CaseListItem,
  actions: CorrectiveAction[],
  evidence: CaseEvidence[],
  verification: VerificationRecord | null,
): CaseTimelineEvent[] {
  const info = buildCaseInformation(item);
  const owner = item.ownerId ? USER_BY_ID[item.ownerId] : null;
  const reviewer = reviewerFor(item);
  const group = statusGroupOf(item.status);
  const events: CaseTimelineEvent[] = [];

  const push = (event: CaseTimelineEvent) => events.push(event);
  const key = item.caseNo.slice(-6);

  push({
    id: `tl_${key}_detect`,
    kind: "DETECTED",
    at: item.lastDetectedAt < item.openedAt ? item.lastDetectedAt : item.openedAt,
    actorId: null,
    actorName: "Enterprise Data Platform",
    actorRole: null,
    title: "Enterprise Data Platform detected the exception",
    detail: `${info.detectionRuleId} · ${info.detectionRuleName} evaluated true against the ${item.plantCode} dataset.`,
    facts: [
      { label: "Signal", value: info.signalRef },
      { label: "Rule", value: info.detectionRuleId },
      { label: "Detections", value: `${item.recurrenceCount}` },
    ],
  });

  push({
    id: `tl_${key}_created`,
    kind: "CASE_CREATED",
    at: item.openedAt,
    actorId: null,
    actorName: "QuikOps ingestion",
    actorRole: null,
    title: "Case created and scored",
    detail: `Priority scored ${item.priorityScore.toFixed(1)} (${
      item.priorityBand
    }) by the deterministic rule set. SLA clock started.`,
    facts: [
      { label: "Priority", value: `${item.priorityScore.toFixed(1)} · ${item.priorityBand}` },
      { label: "Revenue at risk", value: formatMoney(item.revenueAtRisk, item.currency) },
      { label: "Due", value: new Date(item.dueAt).toISOString().slice(0, 10) },
    ],
  });

  if (item.playbookId) {
    push({
      id: `tl_${key}_playbook`,
      kind: "PLAYBOOK_APPLIED",
      at: plusHours(item.openedAt, 1),
      actorId: null,
      actorName: "QuikOps rule engine",
      actorRole: null,
      title: "Playbook applied",
      detail: `Playbook ${item.playbookId} matched the exception type and seeded ${actions.length} corrective actions.`,
      facts: [
        { label: "Playbook", value: item.playbookId },
        { label: "Actions seeded", value: `${actions.length}` },
      ],
    });
  }

  if (item.assignedAt && owner) {
    push({
      id: `tl_${key}_assigned`,
      kind: "ASSIGNED",
      at: item.assignedAt,
      actorId: reviewer.id,
      actorName: reviewer.name,
      actorRole: reviewer.role,
      title: `Assigned to ${owner.name}`,
      detail: `${owner.name} (${owner.jobTitle}) took ownership. ${reviewer.name} named as reviewer.`,
      facts: [
        { label: "Owner", value: owner.name },
        { label: "Reviewer", value: reviewer.name },
      ],
    });
  }

  if (
    group === "IN_PROGRESS" ||
    group === "WAITING_VERIFICATION" ||
    group === "VERIFIED" ||
    group === "CLOSED"
  ) {
    push({
      id: `tl_${key}_started`,
      kind: "WORK_STARTED",
      at: plusHours(item.assignedAt ?? item.openedAt, 2),
      actorId: owner?.id ?? null,
      actorName: owner?.name ?? "Case owner",
      actorRole: owner?.role ?? null,
      title: "Work started",
      detail: "Case moved to in progress and the corrective action plan was opened.",
      facts: [{ label: "Actions", value: `${actions.length} planned` }],
    });
  }

  actions
    .filter((action) => action.status === "DONE" && action.completedAt)
    .forEach((action, index) => {
      push({
        id: `tl_${key}_action_${index}`,
        kind: "ACTION_COMPLETED",
        at: action.completedAt!,
        actorId: action.ownerId,
        actorName: USER_BY_ID[action.ownerId]?.name ?? "Action owner",
        actorRole: USER_BY_ID[action.ownerId]?.role ?? null,
        title: `Action completed — ${action.title}`,
        detail: action.notes,
        facts: [{ label: "Progress", value: "100%" }],
      });
    });

  evidence
    .filter((file) => file.uploadedById !== "system")
    .forEach((file, index) => {
      push({
        id: `tl_${key}_evidence_${index}`,
        kind: "EVIDENCE_UPLOADED",
        at: file.uploadedAt,
        actorId: file.uploadedById,
        actorName: file.uploadedByName,
        actorRole: USER_BY_ID[file.uploadedById]?.role ?? null,
        title: "Evidence uploaded",
        detail: `${file.fileName} — ${file.description}`,
        facts: [{ label: "Type", value: file.kind }],
      });
    });

  if (item.escalationLevel > 0) {
    push({
      id: `tl_${key}_escalated`,
      kind: "ESCALATED",
      at: between(item.openedAt, item.dueAt, 0.7),
      actorId: null,
      actorName: "QuikOps SLA monitor",
      actorRole: null,
      title: `Escalated to level ${item.escalationLevel}`,
      detail:
        "SLA threshold reached with insufficient action progress. Escalation notified the reviewer and the plant manager.",
      facts: [{ label: "Level", value: `${item.escalationLevel}` }],
    });
  }

  if (verification) {
    push({
      id: `tl_${key}_verify_req`,
      kind: "VERIFICATION_REQUESTED",
      at: verification.requestedAt,
      actorId: verification.requestedById,
      actorName: verification.requestedByName,
      actorRole: USER_BY_ID[verification.requestedById]?.role ?? null,
      title: "Verification requested",
      detail: `Submitted to ${verification.reviewerName} with the measurement window evidence attached.`,
      facts: [
        { label: "Reviewer", value: verification.reviewerName },
        { label: "Window", value: `${verification.measurementWindowDays} days` },
      ],
    });

    if (verification.decision === "APPROVED" && verification.decidedAt) {
      push({
        id: `tl_${key}_verify_ok`,
        kind: "VERIFICATION_APPROVED",
        at: verification.decidedAt,
        actorId: verification.reviewerId,
        actorName: verification.reviewerName,
        actorRole: USER_BY_ID[verification.reviewerId]?.role ?? null,
        title: "Verification approved",
        detail: verification.comment,
        facts: [
          {
            label: "KPI",
            value: `${verification.kpiBaseline} → ${verification.kpiCurrent ?? "—"}`,
          },
          { label: "Target", value: `${verification.kpiTarget}` },
        ],
      });
    }
  }

  if (item.status === "REOPENED") {
    push({
      id: `tl_${key}_reopened`,
      kind: "REOPENED",
      at: item.openedAt,
      actorId: null,
      actorName: "QuikOps recurrence monitor",
      actorRole: null,
      title: "Case reopened",
      detail:
        "The same condition recurred inside the 30-day recurrence window, so the closed case was reopened rather than a new one raised.",
      facts: [{ label: "Detections", value: `${item.recurrenceCount}` }],
    });
  }

  if (item.closedAt) {
    push({
      id: `tl_${key}_closed`,
      kind: "CASE_CLOSED",
      at: item.closedAt,
      actorId: reviewer.id,
      actorName: reviewer.name,
      actorRole: reviewer.role,
      title: "Case closed",
      detail: `Closed after the ${item.measurementWindowDays}-day measurement window with the KPI holding against target.`,
      facts: [{ label: "Outcome", value: "Recovered" }],
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/* ------------------------------------------------------------------ Audit log */

export function buildAuditLog(
  item: CaseListItem,
  timeline: CaseTimelineEvent[],
  verification: VerificationRecord | null,
): CaseAuditEntry[] {
  const owner = item.ownerId ? USER_BY_ID[item.ownerId] : null;
  const reviewer = reviewerFor(item);
  const key = item.caseNo.slice(-6);
  const entries: CaseAuditEntry[] = [];

  const sourceFor = (kind: CaseTimelineEvent["kind"]): CaseAuditEntry["source"] => {
    if (kind === "DETECTED") return "EVERY_ANGLE";
    if (kind === "CASE_CREATED" || kind === "PLAYBOOK_APPLIED" || kind === "ESCALATED") {
      return "RULE_ENGINE";
    }
    if (kind === "ASSIGNED") return "WORK_MANAGER";
    return "CASE_DETAIL";
  };

  timeline.forEach((event) => {
    entries.push({
      id: `aud_${event.id}`,
      at: event.at,
      actorId: event.actorId,
      actorName: event.actorName,
      actorRole: event.actorRole,
      action: event.title,
      field: null,
      fromValue: null,
      toValue: null,
      source: sourceFor(event.kind),
    });
  });

  // Field-level rows the narrative timeline deliberately does not carry.
  entries.push({
    id: `aud_${key}_priority`,
    at: item.openedAt,
    actorId: null,
    actorName: "QuikOps rule engine",
    actorRole: null,
    action: "Priority score computed",
    field: "priorityScore",
    fromValue: null,
    toValue: `${item.priorityScore.toFixed(1)} (${item.priorityBand})`,
    source: "RULE_ENGINE",
  });

  entries.push({
    id: `aud_${key}_sla`,
    at: item.openedAt,
    actorId: null,
    actorName: "QuikOps SLA monitor",
    actorRole: null,
    action: "SLA target set",
    field: "dueAt",
    fromValue: null,
    toValue: new Date(item.dueAt).toISOString(),
    source: "RULE_ENGINE",
  });

  if (item.assignedAt && owner) {
    entries.push({
      id: `aud_${key}_owner`,
      at: item.assignedAt,
      actorId: reviewer.id,
      actorName: reviewer.name,
      actorRole: reviewer.role,
      action: "Owner changed",
      field: "ownerId",
      fromValue: "Unassigned",
      toValue: owner.name,
      source: "WORK_MANAGER",
    });
    entries.push({
      id: `aud_${key}_status_assigned`,
      at: item.assignedAt,
      actorId: reviewer.id,
      actorName: reviewer.name,
      actorRole: reviewer.role,
      action: "Status changed",
      field: "status",
      fromValue: "NEW",
      toValue: "ASSIGNED",
      source: "WORK_MANAGER",
    });
  }

  if (item.slaBreachedAt) {
    entries.push({
      id: `aud_${key}_breach`,
      at: item.slaBreachedAt,
      actorId: null,
      actorName: "QuikOps SLA monitor",
      actorRole: null,
      action: "SLA breached",
      field: "slaBreachedAt",
      fromValue: null,
      toValue: new Date(item.slaBreachedAt).toISOString(),
      source: "RULE_ENGINE",
    });
  }

  if (verification?.decision) {
    entries.push({
      id: `aud_${key}_verify_decision`,
      at: verification.decidedAt ?? verification.requestedAt,
      actorId: verification.reviewerId,
      actorName: verification.reviewerName,
      actorRole: USER_BY_ID[verification.reviewerId]?.role ?? null,
      action: "Verification decision recorded",
      field: "verification.decision",
      fromValue: "PENDING",
      toValue: verification.decision,
      source: "CASE_DETAIL",
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
/* --------------------------------------------------------------- Case health */

/** Scored by the shared domain rule so the server and the live page agree. */
export function buildCaseHealth(
  item: CaseListItem,
  actions: CorrectiveAction[],
): CaseHealth {
  return scoreCaseHealth(
    {
      status: item.status,
      ownerId: item.ownerId,
      dueAt: item.dueAt,
      escalationLevel: item.escalationLevel,
      recurrenceCount: item.recurrenceCount,
      priorityBand: item.priorityBand,
      actions,
    },
    DEMO_NOW,
  );
}

import type { ExceptionType } from "@/src/domain/types";

/**
 * The knowledge layer behind the playbooks.
 *
 * Three kinds of content, written for a tier-one automotive and aerospace
 * components manufacturer and grounded in the same nine exception types the
 * rest of the product uses:
 *
 * - **SOPs** — the standing procedure for a condition, with the steps a
 *   competent operator follows and the trap each step exists to avoid.
 * - **Preventive actions** — what stops the condition recurring, as distinct
 *   from what clears this instance. Every one names the signal that would tell
 *   you it worked.
 * - **Knowledge articles** — the reasoning a new joiner needs and an
 *   experienced one has internalised. Written to be read once and remembered.
 *
 * Everything here is *procedural* content, not seeded metrics: nothing in this
 * file is a number the product reports. That distinction matters — the figures
 * on the Playbooks screen are measured from the case corpus
 * (`playbook-effectiveness.ts`), and this file must never become a second place
 * they could come from.
 */

export type KnowledgeCategory =
  | "Supplier"
  | "Material"
  | "Capacity"
  | "Quality"
  | "Inventory"
  | "Governance";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "Supplier",
  "Material",
  "Capacity",
  "Quality",
  "Inventory",
  "Governance",
];

/* ------------------------------------------------------------------ SOPs --- */

export interface SopStep {
  title: string;
  /** What to do. */
  detail: string;
  /** The mistake this step exists to prevent. Written from real failure. */
  guardrail: string;
}

export interface Sop {
  id: string;
  code: string;
  title: string;
  category: KnowledgeCategory;
  exceptionType: ExceptionType;
  purpose: string;
  /** Who signs it off. */
  approver: string;
  version: string;
  updatedAt: string;
  steps: SopStep[];
}

export const SOP_LIBRARY: Sop[] = [
  {
    id: "sop_supplier_date_change",
    code: "SOP-SC-014",
    title: "Confirming a supplier date change",
    category: "Supplier",
    exceptionType: "VENDOR_DELAY",
    purpose:
      "A verbal date is not a commitment. This procedure converts a supplier's revised promise into something the plan can be rebuilt on, and creates the record a commercial escalation later depends on.",
    approver: "Head of Procurement",
    version: "v4",
    updatedAt: "2026-06-18T00:00:00.000Z",
    steps: [
      {
        title: "Obtain the revised date in writing, with a named signatory",
        detail:
          "Email or portal confirmation naming the line item, the quantity and the ex-works date. A ship date is not a receipt date — record which one the supplier has given you.",
        guardrail:
          "A date taken by phone and typed into the system becomes indistinguishable from a confirmed one within a week. Every subsequent argument then turns on whose memory is better.",
      },
      {
        title: "Establish whether the quantity splits",
        detail:
          "Ask explicitly whether the full quantity moves or a partial shipment holds the original date. Suppliers default to quoting the last line to clear.",
        guardrail:
          "Assuming a full slip when a partial would have covered the nearest promised date is the most common way an avoidable customer miss gets booked.",
      },
      {
        title: "Net the revised receipt against confirmed demand",
        detail:
          "Identify which orders are exposed and by how many days, using confirmed demand only. Forecast demand is not a commitment and must not drive an expedite decision.",
        guardrail:
          "Expediting against forecast is how a plant pays air freight for stock that then sits. Confirmed demand is the only defensible basis.",
      },
      {
        title: "Record the promise history on the case",
        detail:
          "Log the original date, this revision, and the number of times this supplier has moved a confirmed date in the last two quarters.",
        guardrail:
          "The second slip is a supply problem. The fourth is a commercial one, and it cannot be argued without the count.",
      },
    ],
  },
  {
    id: "sop_shortage_containment",
    code: "SOP-MP-021",
    title: "Containing a material shortage inside lead time",
    category: "Material",
    exceptionType: "MATERIAL_SHORTAGE",
    purpose:
      "Protect the nearest promised date while the underlying coverage gap is closed, without consuming buffer that a larger order will need next week.",
    approver: "Materials Planning Manager",
    version: "v3",
    updatedAt: "2026-05-30T00:00:00.000Z",
    steps: [
      {
        title: "Verify the physical balance before acting on the system balance",
        detail:
          "Walk the location. Confirm on-hand, allocated and quarantined quantities against what the ERP reports.",
        guardrail:
          "A phantom shortage costs more than it saves: expediting against a counting error burns freight, supplier goodwill and the planner's credibility at once.",
      },
      {
        title: "Rank the exposed orders by promised date and customer tier",
        detail:
          "Allocate available stock to the nearest promised date first, breaking ties on customer tier. Record the allocation decision on the case.",
        guardrail:
          "Allocating to whoever asked most recently is the default in the absence of a rule, and it reliably starves the tier-one account that did not chase.",
      },
      {
        title: "Confirm alternate supply in writing before committing to it",
        detail:
          "An approved alternate needs a written lead time and confirmation that the qualification is current for this application.",
        guardrail:
          "An alternate that is qualified for one application and not another produces a quality hold two weeks later — the same exposure, now with scrap attached.",
      },
      {
        title: "Reset the reorder threshold before closing",
        detail:
          "Recalculate the safety level against the last ninety days of consumption so the detection rule fires with usable lead time next cycle.",
        guardrail:
          "Closing without changing the threshold guarantees the same case reopens. Recurrence is the signal that this step was skipped.",
      },
    ],
  },
  {
    id: "sop_capacity_resequence",
    code: "SOP-PR-009",
    title: "Re-sequencing a constrained line",
    category: "Capacity",
    exceptionType: "CAPACITY_CONSTRAINT",
    purpose:
      "Capacity cannot be added inside the window, so the only available lever is which orders take the hours that exist. This procedure makes that choice explicit and defensible.",
    approver: "Plant Operations Manager",
    version: "v2",
    updatedAt: "2026-07-02T00:00:00.000Z",
    steps: [
      {
        title: "Freeze the sequence before analysing it",
        detail:
          "Take the current queue as at a stated time. Re-sequencing against a moving queue produces a plan that was never achievable.",
        guardrail:
          "Two planners working from queues taken an hour apart will produce incompatible sequences and each will believe the other is wrong.",
      },
      {
        title: "Order by promised date, not by order value",
        detail:
          "Confirmed promised dates set the sequence. Value breaks ties only where dates are equal.",
        guardrail:
          "Sequencing by value quietly converts a capacity problem into a delivery-reliability problem, which is far more expensive and much harder to see.",
      },
      {
        title: "Account for changeover, not just run time",
        detail:
          "Include setup and changeover in the hours available. A sequence that ignores changeover overstates capacity by the amount that matters most.",
        guardrail:
          "The most common re-sequencing failure is a plan that is arithmetically correct on run hours and impossible on the floor.",
      },
      {
        title: "Notify every customer whose date moves, before it passes",
        detail:
          "Contact affected customers with the revised date the same day the sequence is published.",
        guardrail:
          "A date communicated after it has passed is not a notification, it is an apology — and it costs reliability standing that takes quarters to rebuild.",
      },
    ],
  },
  {
    id: "sop_quality_hold",
    code: "SOP-QA-006",
    title: "Dispositioning a quality hold",
    category: "Quality",
    exceptionType: "QUALITY_HOLD",
    purpose:
      "Contain the affected quantity immediately, then decide its fate on evidence. Quantity at risk grows for every hour a hold sits undispositioned.",
    approver: "Quality Manager",
    version: "v5",
    updatedAt: "2026-07-21T00:00:00.000Z",
    steps: [
      {
        title: "Quarantine physically, not just in the system",
        detail:
          "Segregate the affected lot and block it from consumption. Record the location and the quantity segregated.",
        guardrail:
          "A system block with the material still on the line is consumed by the next shift, and the containment boundary is lost along with the traceability.",
      },
      {
        title: "Establish the boundary of the affected population",
        detail:
          "Identify what else shares the lot, the tool, the shift or the supplier batch. Widen the containment before narrowing it.",
        guardrail:
          "Containing to the reported parts and finding two more affected lots a week later turns a contained event into a customer notification.",
      },
      {
        title: "Disposition against evidence, with the authoriser recorded",
        detail:
          "Scrap, rework or use-as-is, decided by quality with the name of the authoriser on the case.",
        guardrail:
          "Use-as-is without a named authoriser is the disposition nobody will own in an audit, and it is the one auditors look for first.",
      },
      {
        title: "Open supplier corrective action where the cause is supplied",
        detail:
          "Raise a formal corrective action with a required response date, not a request for comment.",
        guardrail:
          "An informal conversation closes the case and changes nothing at the supplier. Recurrence on the same part number is the proof.",
      },
    ],
  },
  {
    id: "sop_verification",
    code: "SOP-GV-002",
    title: "Verifying a resolved case",
    category: "Governance",
    exceptionType: "OTHER",
    purpose:
      "Verification is the only route by which exposure counts as recovered. This procedure defines what a reviewer checks before approving.",
    approver: "VP Global Operations",
    version: "v3",
    updatedAt: "2026-06-04T00:00:00.000Z",
    steps: [
      {
        title: "Confirm the reviewer is not the owner",
        detail:
          "The person who did the work cannot approve it. The platform enforces this; the procedure states why.",
        guardrail:
          "Self-verification produces a clean dashboard and an unchanged operation. It is the single fastest way to make the recovered figure meaningless.",
      },
      {
        title: "Check the evidence supports the claim, not merely that it exists",
        detail:
          "Read what was attached. A file count is not evidence; a written supplier confirmation of a revised date is.",
        guardrail:
          "Approving on the presence of attachments trains owners to attach anything, and the evidence locker becomes a formality within a quarter.",
      },
      {
        title: "Confirm the condition cleared, not just that the actions closed",
        detail:
          "The measured KPI must have moved. Completed actions with an unmoved KPI mean the corrective action addressed the wrong thing.",
        guardrail:
          "This is the distinction between activity and outcome, and it is the whole reason the verification step exists.",
      },
      {
        title: "Reject with a reason, or send back with a specific request",
        detail:
          "A rejection without a stated gap costs a full cycle and teaches nothing.",
        guardrail:
          "Vague rejections are how verification becomes an adversarial queue instead of a quality gate.",
      },
    ],
  },
];

/* ---------------------------------------------------- Preventive actions --- */

export interface PreventiveAction {
  id: string;
  title: string;
  category: KnowledgeCategory;
  exceptionType: ExceptionType;
  /** What recurring condition this is meant to stop. */
  addresses: string;
  /** What is actually done. */
  intervention: string;
  /** The measurable signal that would show it worked. */
  successSignal: string;
  /** Realistic effort, stated so it can be scheduled rather than aspired to. */
  effort: "Low" | "Medium" | "High";
  owningRole: "OPS_MANAGER" | "TASK_OWNER" | "ANALYST" | "ADMINISTRATOR";
}

export const PREVENTIVE_ACTIONS: PreventiveAction[] = [
  {
    id: "prev_supplier_scorecard",
    title: "Promise-reliability scorecard in the quarterly supplier review",
    category: "Supplier",
    exceptionType: "VENDOR_DELAY",
    addresses:
      "Suppliers who move confirmed dates repeatedly without commercial consequence, because each slip is handled as an isolated expedite.",
    intervention:
      "Count confirmed-date changes per supplier per quarter and put the count on the review agenda alongside price and quality. Agree a threshold above which capacity is renegotiated rather than re-expedited.",
    successSignal:
      "Falling recurrence rate on VENDOR_DELAY cases for the named suppliers, measured over two quarters rather than one.",
    effort: "Medium",
    owningRole: "OPS_MANAGER",
  },
  {
    id: "prev_threshold_review",
    title: "Quarterly reorder-threshold review against actual consumption",
    category: "Material",
    exceptionType: "MATERIAL_SHORTAGE",
    addresses:
      "Safety levels set against a demand profile that has since changed, so detection fires inside lead time and every case is already an expedite.",
    intervention:
      "Recalculate safety stock for the top fifty materials by consumption value against the last ninety days, and adjust where the variance exceeds twenty percent.",
    successSignal:
      "Detection moving earlier relative to the promised date — the same conditions caught with lead time to act rather than only to escalate.",
    effort: "Medium",
    owningRole: "ANALYST",
  },
  {
    id: "prev_changeover_study",
    title: "Changeover time study on the two most constrained lines",
    category: "Capacity",
    exceptionType: "CAPACITY_CONSTRAINT",
    addresses:
      "Sequences that are arithmetically achievable and physically impossible, because planned changeover is materially shorter than actual.",
    intervention:
      "Measure actual changeover across a full shift pattern on the constrained lines and update the routings with the observed figure, including the weekend shift.",
    successSignal:
      "Schedule adherence rising without capacity being added, and fewer capacity cases raised in the week after a re-sequence.",
    effort: "High",
    owningRole: "OPS_MANAGER",
  },
  {
    id: "prev_incoming_inspection",
    title: "Tighten incoming inspection on repeat-offender characteristics",
    category: "Quality",
    exceptionType: "QUALITY_HOLD",
    addresses:
      "Characteristics that have escaped to the line more than once, where inspection sampling is set at a level that cannot catch them.",
    intervention:
      "Identify characteristics with two or more escapes in six months and raise the inspection level for those specific features until three consecutive clean lots.",
    successSignal:
      "Quality holds detected at goods-in rather than on the line, and a falling quantity at risk per hold.",
    effort: "Low",
    owningRole: "TASK_OWNER",
  },
  {
    id: "prev_routing_rules",
    title: "Review assignment routing against actual ownership",
    category: "Governance",
    exceptionType: "OTHER",
    addresses:
      "Cases sitting unowned because the routing default no longer matches who actually handles that plant and exception type.",
    intervention:
      "Compare the derived routing rules against who has genuinely owned each combination for the last quarter, and correct the defaults where they disagree.",
    successSignal:
      "Time from detection to assignment falling, and the unowned count on the dashboard trending toward zero.",
    effort: "Low",
    owningRole: "ADMINISTRATOR",
  },
  {
    id: "prev_coverage_alerting",
    title: "Second-tier coverage alert for single-sourced materials",
    category: "Inventory",
    exceptionType: "INVENTORY_STOCKOUT",
    addresses:
      "Single-sourced materials where any yield loss or demand pull-in exhausts the balance before replenishment lands, with no earlier warning than the stockout itself.",
    intervention:
      "Flag materials that are single-sourced with a lead time longer than their coverage buffer, and alert on projected balance at two thresholds rather than one.",
    successSignal:
      "Stockout cases replaced by shortage cases raised earlier — the same condition caught while it is still preventable.",
    effort: "Medium",
    owningRole: "ANALYST",
  },
];

/* --------------------------------------------------- Knowledge articles --- */

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  /** One line, for the card. */
  summary: string;
  /** Read time in minutes, so a reader can decide before opening. */
  readMinutes: number;
  body: string[];
  /** Related SOP codes, so the reasoning and the procedure stay connected. */
  relatedSopCodes: string[];
  keywords: string[];
}

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "kb_promise_drift",
    title: "Why the second date change matters more than the first",
    category: "Supplier",
    summary:
      "A single slip is a supply event. A pattern of slips is a commercial position, and it is handled differently.",
    readMinutes: 3,
    body: [
      "Every supplier moves a date occasionally. Machines break, materials are short upstream, and a good supplier tells you early. Handled as a one-off, that is an expedite decision: price the options, protect the nearest promised date, move on.",
      "The second change on the same line item is a different event. It says the revised date was not built on anything more solid than the first one — and the cost of treating it as another isolated expedite is that you pay freight twice and still miss.",
      "The practical test is whether the supplier can name what changed between the two commitments. A specific answer — a qualified second source came online, a tool was repaired — supports a third date. An unspecific one does not, and the correct response is to stop negotiating dates and start negotiating capacity.",
      "This is why the case record keeps the promise history rather than only the current date. The count is the argument, and it cannot be made from memory in a quarterly review.",
    ],
    relatedSopCodes: ["SOP-SC-014"],
    keywords: ["supplier", "delay", "promise", "date change", "expedite", "escalation"],
  },
  {
    id: "kb_recurrence",
    title: "Recurrence means the corrective action did not hold",
    category: "Governance",
    summary:
      "A repeat detection is a stronger signal than a new one. It says the previous fix addressed the symptom.",
    readMinutes: 3,
    body: [
      "When the same condition is detected again, the useful reading is not that a new problem appeared. It is that the previous corrective action closed without changing what produced the condition.",
      "That distinction changes what to do. Running the same playbook again buys one cycle at the same cost as last time. Changing the playbook — or the threshold, or the routing — is the only thing that reduces the inflow.",
      "The trap is that re-running the playbook feels like progress and shows as progress: the case closes, the queue shortens, the dashboard improves. It is the recurrence rate, not the open count, that tells you whether any of it held.",
      "Practically: before closing a recurring case, name the difference between what you did this time and what was done last time. If there is no difference, expect the case again.",
    ],
    relatedSopCodes: ["SOP-MP-021", "SOP-QA-006"],
    keywords: ["recurrence", "root cause", "corrective action", "playbook", "closure"],
  },
  {
    id: "kb_verification",
    title: "What a reviewer is actually checking",
    category: "Governance",
    summary:
      "Verification is not a second look at the work. It is a check that the condition cleared.",
    readMinutes: 4,
    body: [
      "The most common verification failure is approving on activity: the actions are complete, the evidence is attached, the owner says it is done. All three can be true while the condition that raised the case is unchanged.",
      "What a reviewer checks is narrower and harder. Did the measured KPI move? Is the evidence specific enough that someone who was not there could confirm the claim? Would this condition be detected again next week?",
      "This is why exposure is recovered on verification and never on closure. Closing removes a case from the queue; it says nothing about the operation. If closing recovered revenue, the fastest route to a clean dashboard would be to close everything — and that is precisely the behaviour the split exists to prevent.",
      "A rejection is not a failure of the owner. It is the gate working. What makes a rejection expensive is vagueness: send it back with the specific gap, not with a general dissatisfaction.",
    ],
    relatedSopCodes: ["SOP-GV-002"],
    keywords: ["verification", "review", "evidence", "recovered", "approval", "KPI"],
  },
  {
    id: "kb_priority_vs_health",
    title: "Priority and health answer different questions",
    category: "Governance",
    summary:
      "Priority says how much a case matters. Health says whether anyone is moving it.",
    readMinutes: 2,
    body: [
      "A critical case being executed well and a low-band case nobody has touched are different problems, and a single ranked list hides that.",
      "Priority is scored from what is at stake — revenue, KPI deviation, customer tier, days to the promised date, recurrence, escalation. It does not change because work started.",
      "Health is scored from whether the work is moving — actions progressing, evidence arriving, the case advancing through its lifecycle. A critical case can be perfectly healthy, and that is a good state: it means the most important thing is also the thing being worked.",
      "The combination worth acting on is high priority and poor health. That is not a queue-ordering problem, it is an intervention.",
    ],
    relatedSopCodes: [],
    keywords: ["priority", "health", "scoring", "triage", "execution"],
  },
  {
    id: "kb_phantom_shortage",
    title: "Confirm the balance before you expedite against it",
    category: "Material",
    summary:
      "A counting error costs more than the shortage it appears to describe.",
    readMinutes: 2,
    body: [
      "System balance and physical balance diverge for ordinary reasons: goods received but not booked, material moved without a transaction, quarantined stock still counted as available.",
      "Expediting against a phantom shortage spends freight, consumes supplier goodwill on a request that did not need making, and — the part that lasts — teaches the supplier that your urgency is not a reliable signal.",
      "The walk takes twenty minutes. It is the highest-return twenty minutes in the procedure, and it is the step most often skipped when the case is already breaching.",
      "If the balance was wrong, the case is still worth keeping open: the transaction gap that produced the error will produce another one.",
    ],
    relatedSopCodes: ["SOP-MP-021"],
    keywords: ["shortage", "inventory", "balance", "expedite", "phantom", "stock"],
  },
];

/* -------------------------------------------------------------- Lookups --- */

/** SOPs written for a given exception type. */
export function sopsForException(type: ExceptionType): Sop[] {
  return SOP_LIBRARY.filter((sop) => sop.exceptionType === type);
}

/** Preventive actions that address a given exception type. */
export function preventiveActionsForException(type: ExceptionType): PreventiveAction[] {
  return PREVENTIVE_ACTIONS.filter((action) => action.exceptionType === type);
}

/** Articles whose related SOPs cover a given exception type. */
export function articlesForException(type: ExceptionType): KnowledgeArticle[] {
  const codes = new Set(sopsForException(type).map((sop) => sop.code));
  return KNOWLEDGE_ARTICLES.filter((article) =>
    article.relatedSopCodes.some((code) => codes.has(code)),
  );
}

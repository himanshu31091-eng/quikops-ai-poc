import type { UserRole } from "@/src/domain/types";
import { GOLDEN_CASE_NO } from "@/src/data/fixtures/cases";

/**
 * Guided product tours.
 *
 * Steps anchor to `data-tour` attributes rather than CSS selectors. A selector
 * breaks the moment a class changes — and this codebase's classes are composed
 * from tokens that get refactored — whereas a data attribute is an explicit
 * contract the component opts into.
 *
 * Tours are role-based because the product looks different depending on whether
 * you sponsor the work or do it: the executive tour never opens a case, the
 * operator tour never dwells on the dashboard.
 *
 * **Each step is written to be read aloud.** A tour that describes what a
 * control is called teaches nothing — the label already says that. Each body
 * says what the thing is *for* and, where there is one, the trap it exists to
 * avoid. `tip` carries the line worth repeating in a demo; `whenHidden`
 * explains the step when its anchor is off-screen at the current width, so a
 * narrow window degrades the highlight rather than the content.
 */

export interface TourStep {
  id: string;
  /** The `data-tour` value this step points at. */
  anchor: string;
  title: string;
  body: string;
  /** Navigated to before the step is shown, when it differs from the current route. */
  route: string;
  placement?: "top" | "bottom" | "left" | "right";
  /** The one line worth quoting. Rendered as a highlighted callout. */
  tip?: string;
  /** Shown instead of the highlight when the anchor is not visible at this width. */
  whenHidden?: string;
}

export interface TourDefinition {
  id: string;
  name: string;
  audience: UserRole;
  description: string;
  steps: TourStep[];
}

const NAV_HIDDEN =
  "The sidebar collapses below 1024px — open the navigation menu from the top bar to see this item.";

/* ------------------------------------------------------------- Executive --- */

const EXECUTIVE_STEPS: TourStep[] = [
  {
    id: "exec-kpi",
    anchor: "dashboard-kpi-band",
    title: "The position, in four numbers",
    body: "On-time in full, revenue at risk, open criticals and SLA breaches. Every one is a link — the number and the work behind it are never more than one click apart.",
    route: "/dashboard",
    placement: "bottom",
    tip: "Revenue at risk is exposure, not a loss already taken. It leaves this number one way only.",
  },
  {
    id: "exec-strip",
    anchor: "dashboard-execution-strip",
    title: "How well the operation executes",
    body: "Mean time to resolve, SLA adherence, verification pass rate, recurrence and throughput. These describe the machine rather than the moment — a bad week shows in the KPIs above, a bad process shows here.",
    route: "/dashboard",
    placement: "bottom",
    tip: "Recurrence rate is the one to watch. It says whether corrective actions are holding or whether you are paying for the same problem twice.",
  },
  {
    id: "exec-summary",
    anchor: "dashboard-ai-summary",
    title: "A briefing, not a chatbot",
    body: "Every figure here is computed from the same case data the tables below show, with callouts pointing at the cases behind them. It is composed from the record rather than written by a model, which is what lets you quote it in a review without checking it first.",
    route: "/dashboard",
    placement: "bottom",
  },
  {
    id: "exec-flow",
    anchor: "dashboard-flow",
    title: "Is this getting better?",
    body: "The open count tells you where you are. This tells you which direction you are moving and how fast — what arrived against what left over the last four weeks, and when the backlog clears at that rate.",
    route: "/dashboard",
    placement: "bottom",
    tip: "No other number on this screen can answer 'are we winning?'. This one can.",
  },
  {
    id: "exec-copilot",
    anchor: "dashboard-copilot",
    title: "Ask about the portfolio",
    body: "The Copilot answers from the same case record every panel reads. It explains and recommends; it never sets a priority, decides a status or invents a figure. Ask it how many cases are open and the answer will match the card above exactly.",
    route: "/dashboard",
    placement: "left",
  },
  {
    id: "exec-analytics-nav",
    anchor: "nav-analytics",
    title: "Where the trend lives",
    body: "The dashboard is the position now. Execution Analytics is how it got here — performance by plant and owner, and the full flow and forecast region.",
    route: "/dashboard",
    placement: "right",
    whenHidden: NAV_HIDDEN,
  },
  {
    id: "exec-flow-region",
    anchor: "analytics-flow",
    title: "The balance, read as a sentence",
    body: "Open at the start, plus what was detected, minus what was resolved, equals open now — and it reconciles exactly. Switch the whole region between case counts and revenue exposure with the toggle at the top.",
    route: "/analytics",
    placement: "bottom",
    tip: "Exposure is the more persuasive lens for a board. It is one click away and applies to every chart below.",
  },
  {
    id: "exec-briefing",
    anchor: "analytics-briefing",
    title: "What to do about it",
    body: "The read, what is driving it, and ranked recommendations carrying the exposure that justifies each one. Every card deep-links into the queue already filtered to what it describes.",
    route: "/analytics",
    placement: "top",
    tip: "A narrative that ends without a next action is a report. This one ends in a link.",
  },
];

/* --------------------------------------------------------------- Manager --- */

const MANAGER_STEPS: TourStep[] = [
  {
    id: "mgr-kpi",
    anchor: "work-kpi-band",
    title: "Your queue in four cuts",
    body: "Unassigned, overdue, critical and awaiting verification. Each tile is a filter — click it and the queue below narrows to exactly that set.",
    route: "/work",
    placement: "bottom",
  },
  {
    id: "mgr-queue",
    anchor: "work-toolbar",
    title: "One queue, nothing lost",
    body: "Search across case number, material, supplier, plant, owner and customer at once. Filters carry live counts, so you can see there is no point filtering before you click.",
    route: "/work",
    placement: "bottom",
    tip: "The whole view round-trips through the URL. Any queue you build here can be sent to someone as a link.",
  },
  {
    id: "mgr-case",
    anchor: "case-header",
    title: "Inside a case",
    body: "Priority is scored 0–100 by a deterministic rule set — revenue at risk, KPI deviation, customer tier, days to promised date, recurrence and escalation. Open the chip and every factor is listed with its contribution.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "bottom",
    tip: "An unexplainable priority is an ignored priority. This one can be defended in a review.",
  },
  {
    id: "mgr-actions",
    anchor: "case-actions",
    title: "Progress drives status",
    body: "Owners report a completion percentage and the status follows it. Nobody types a status in this product, which is what lets the queue be read as a measure of where work actually is.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "top",
  },
  {
    id: "mgr-verification",
    anchor: "case-verification",
    title: "The rule the whole model rests on",
    body: "The owner cannot verify their own work. A reviewer approves, rejects, or sends it back — and exposure is recovered on verification, never on closure.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "top",
    tip: "If closing recovered revenue, the fastest route to a clean dashboard would be to close everything. That is exactly what this prevents.",
  },
  {
    id: "mgr-audit",
    anchor: "case-audit",
    title: "Every change, with its source",
    body: "No state change happens without a timeline event and an audit entry — one function writes both, so they cannot diverge. Each entry carries the actor, the field-level before and after, and whether it came from a person, a connector or the rule engine.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "top",
  },
  {
    id: "mgr-actions-nav",
    anchor: "nav-actions",
    title: "The cross-case view",
    body: "A case-level queue hides the fact that one person owns fourteen actions across nine cases. The Action Center is that view.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "right",
    whenHidden: NAV_HIDDEN,
  },
  {
    id: "mgr-action-kpi",
    anchor: "action-kpi-band",
    title: "What needs a decision today",
    body: "Overdue, due today, awaiting approval and escalated. Same pattern as the queue — each tile filters the list beneath it.",
    route: "/actions",
    placement: "bottom",
  },
  {
    id: "mgr-recommendations",
    anchor: "action-recommendations",
    title: "What the platform would do next",
    body: "Ranked by the exposure behind each one, with the drivers listed. Apply one and it becomes a real action on a real case — nothing here is a suggestion you cannot act on in place.",
    route: "/actions",
    placement: "left",
  },
];

/* -------------------------------------------------------------- Operator --- */

const OPERATOR_STEPS: TourStep[] = [
  {
    id: "op-mywork",
    anchor: "nav-my-work",
    title: "Start here every morning",
    body: "My Work is your queue: what you own in priority order, what you have submitted, and anything waiting on you to review.",
    route: "/my-work",
    placement: "right",
    whenHidden: NAV_HIDDEN,
  },
  {
    id: "op-case",
    anchor: "case-header",
    title: "The case you were assigned",
    body: "Everything about this condition in one record — what was detected, what it is worth, who owns it, and how long is left against the target for its band.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "bottom",
  },
  {
    id: "op-actions",
    anchor: "case-actions",
    title: "Report progress, not status",
    body: "Move the percentage as you go and the status follows. If an action is blocked, say so — a blocked action waiting on an external party is the single largest contributor to a missed target on comparable cases.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "top",
  },
  {
    id: "op-evidence",
    anchor: "case-evidence",
    title: "Evidence is what makes it verifiable",
    body: "Attach against the case or against a specific action, and say what it proves. A reviewer checks that the evidence supports the claim, not merely that a file exists.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "top",
    tip: "A written supplier confirmation of a revised date is evidence. A screenshot with no context is a file.",
  },
  {
    id: "op-verification",
    anchor: "case-verification",
    title: "Hand off for verification",
    body: "When the actions are done and the evidence is attached, submit. The case leaves your queue and appears in a reviewer's — and it is not finished until they say so.",
    route: `/work/${GOLDEN_CASE_NO}`,
    placement: "top",
  },
  {
    id: "op-queue",
    anchor: "action-queue",
    title: "Everything you owe, across every case",
    body: "Sorted worst-SLA-first. Select several rows to complete or reassign them together rather than opening each case in turn.",
    route: "/actions",
    placement: "top",
  },
  {
    id: "op-playbooks-nav",
    anchor: "nav-playbooks",
    title: "The play for this condition",
    body: "Each exception type has a playbook — the steps that have worked before, with the owner role and due offset for each.",
    route: "/actions",
    placement: "right",
    whenHidden: NAV_HIDDEN,
  },
  {
    id: "op-knowledge",
    anchor: "playbooks-knowledge",
    title: "Procedure, prevention and reasoning",
    body: "The standing procedure for a condition, what stops it recurring, and why it is done that way. One search spans all three, because when you are looking something up you do not yet know which of them has the answer.",
    route: "/playbooks",
    placement: "top",
    tip: "Every SOP step carries the guardrail it exists for — the mistake that step was written to prevent.",
  },
];

/* --------------------------------------------------------- Administrator --- */

const ADMIN_STEPS: TourStep[] = [
  {
    id: "admin-connectors-nav",
    anchor: "nav-connectors",
    title: "Where the cases come from",
    body: "Seven feeds — enterprise data platform signals and KPI snapshots, the recurrence monitor, SAP master data and orders, Oracle SCM, and the outbound notification gateway.",
    route: "/system/connectors",
    placement: "right",
    whenHidden: NAV_HIDDEN,
  },
  {
    id: "admin-funnel",
    anchor: "connector-funnel",
    title: "Received, deduplicated, processed, rejected",
    body: "The ingestion funnel reconciles with the case corpus by construction: the signal connector reports exactly as many raised cases as there are cases marked as detected by it.",
    route: "/system/connectors",
    placement: "bottom",
    tip: "A connector screen claiming it raised 34 cases beside a queue holding 29 is the defect this design prevents.",
  },
  {
    id: "admin-deadletter",
    anchor: "connector-deadletter",
    title: "Not every failure can be replayed",
    body: "A message rejected for a schema mismatch will fail again identically. Those are marked, and the replay is refused with the reason rather than pretending it might work.",
    route: "/system/connectors",
    placement: "top",
  },
  {
    id: "admin-weights",
    anchor: "admin-weights",
    title: "Configuration with consequences",
    body: "Change a priority weight and every open case re-scores live. The preview lists which cases would change band before anything is saved.",
    route: "/admin",
    placement: "top",
    tip: "A settings page whose consequences you cannot see is a settings page nobody trusts.",
  },
  {
    id: "admin-permissions",
    anchor: "admin-permissions",
    title: "Permissions, derived from the code",
    body: "This is not a checkbox grid. Each row is a rule the product actually enforces, and expanding it names the file that enforces it — so this screen cannot describe a permission the product does not have.",
    route: "/admin",
    placement: "top",
    tip: "An administrator's real question is 'why can this role not verify?'. A grid of ticks cannot answer that.",
  },
  {
    id: "admin-departments",
    anchor: "admin-departments",
    title: "Teams, joined through the owner",
    body: "A case belongs to a person and that person belongs to a team, so reassigning a case moves the work between departments with nothing re-tagged. An unowned case sits in no department — and that absence is the finding, not a gap in the data.",
    route: "/admin",
    placement: "top",
  },
  {
    id: "admin-settings",
    anchor: "admin-settings",
    title: "What the platform is actually running",
    body: "AI, workflow and notification settings read their values from the modules that own them, so this cannot describe a configuration the product is not running. Anything marked Phase 2 is displayed but not yet enforced.",
    route: "/admin",
    placement: "top",
  },
  {
    id: "admin-audit-nav",
    anchor: "nav-audit",
    title: "The append-only record",
    body: "Every state change across every case, with the actor, the field-level before and after, and the source — a person, a connector, or the rule engine.",
    route: "/admin",
    placement: "right",
    whenHidden: NAV_HIDDEN,
  },
];

export const TOURS: TourDefinition[] = [
  {
    id: "tour_executive",
    name: "Executive tour",
    audience: "EXECUTIVE",
    description: "The position, what drives it, and whether it is improving.",
    steps: EXECUTIVE_STEPS,
  },
  {
    id: "tour_manager",
    name: "Manager tour",
    audience: "OPS_MANAGER",
    description: "Triage, execution, verification and the cross-case inbox.",
    steps: MANAGER_STEPS,
  },
  {
    id: "tour_operator",
    name: "Operator tour",
    audience: "TASK_OWNER",
    description: "Working a case from plan to verified hand-off.",
    steps: OPERATOR_STEPS,
  },
  {
    id: "tour_admin",
    name: "Administrator tour",
    audience: "ADMINISTRATOR",
    description: "Integrations, permissions, configuration and the audit trail.",
    steps: ADMIN_STEPS,
  },
];

/** The tour for a role, falling back to the manager tour for analysts. */
export function tourForRole(role: UserRole): TourDefinition {
  return (
    TOURS.find((tour) => tour.audience === role) ??
    TOURS.find((tour) => tour.audience === "OPS_MANAGER")!
  );
}

/** localStorage key recording that a role's tour has been completed. */
export function tourStorageKey(tourId: string): string {
  return `quikops.tour.${tourId}`;
}

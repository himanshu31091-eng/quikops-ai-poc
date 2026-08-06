import type { UserRole } from "@/src/domain/types";

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
}

export interface TourDefinition {
  id: string;
  name: string;
  audience: UserRole;
  description: string;
  steps: TourStep[];
}

const EXECUTIVE_STEPS: TourStep[] = [
  {
    id: "exec-kpi",
    anchor: "dashboard-kpi-band",
    title: "The position, in four numbers",
    body: "On-time in full, revenue at risk, open criticals and SLA breaches. Every one is a link — the number and the work behind it are never more than one click apart.",
    route: "/dashboard",
    placement: "bottom",
  },
  {
    id: "exec-summary",
    anchor: "dashboard-ai-summary",
    title: "A briefing, not a chatbot",
    body: "Every figure here is computed from the same case data the board below shows, with citations back to the cases it describes.",
    route: "/dashboard",
    placement: "bottom",
  },
  {
    id: "exec-copilot",
    anchor: "dashboard-copilot",
    title: "Ask about the whole operation",
    body: "The Copilot answers from the live operational position — which plant is worst, where the exposure sits, what to focus on today.",
    route: "/dashboard",
    placement: "left",
  },
  {
    id: "exec-analytics",
    anchor: "nav-analytics",
    title: "Execution performance",
    body: "Analytics separates operational performance from execution performance. You can be getting better at fixing things and still be losing ground.",
    route: "/dashboard",
    placement: "right",
  },
];

const MANAGER_STEPS: TourStep[] = [
  {
    id: "mgr-queue",
    anchor: "work-toolbar",
    title: "One queue, nothing lost",
    body: "Search across case number, material, supplier, plant, owner and customer at once. Filters carry live counts, so you can see there is no point filtering before you click.",
    route: "/work",
    placement: "bottom",
  },
  {
    id: "mgr-actions",
    anchor: "nav-actions",
    title: "The execution inbox",
    body: "Cases are the unit of accountability; actions are the unit of work. The Action Center is where you see what is actually blocking closure.",
    route: "/work",
    placement: "right",
  },
  {
    id: "mgr-kpi",
    anchor: "action-kpi-band",
    title: "Every tile is a filter",
    body: "Seeing seven overdue is useful; clicking through to the seven is the point. Click an active tile again to clear it.",
    route: "/actions",
    placement: "bottom",
  },
  {
    id: "mgr-recommendations",
    anchor: "action-recommendations",
    title: "Recommendations you can interrogate",
    body: "Confidence is scored by a deterministic rule set, never by a model. Hover the score to see exactly which factors produced it.",
    route: "/actions",
    placement: "left",
  },
];

const OPERATOR_STEPS: TourStep[] = [
  {
    id: "op-mywork",
    anchor: "nav-my-work",
    title: "Your slice of the queue",
    body: "Cases and corrective actions assigned to you, in priority order.",
    route: "/my-work",
    placement: "right",
  },
  {
    id: "op-queue",
    anchor: "action-queue",
    title: "Work the plan",
    body: "Report progress on an action and its status follows the percentage — you never type a status. Select several rows to complete or reassign them together.",
    route: "/actions",
    placement: "top",
  },
  {
    id: "op-playbooks",
    anchor: "nav-playbooks",
    title: "Don't start from scratch",
    body: "Playbooks carry the steps that have worked before, with the measured effect of each on resolution time and recurrence.",
    route: "/actions",
    placement: "right",
  },
];

const ADMIN_STEPS: TourStep[] = [
  {
    id: "admin-connectors",
    anchor: "nav-connectors",
    title: "The integration layer",
    body: "Every Angle ingestion status, run history, deduplication and dead-letter replay. This is where you prove detection is real and monitored.",
    route: "/system/connectors",
    placement: "right",
  },
  {
    id: "admin-weights",
    anchor: "admin-weights",
    title: "Configuration with consequences",
    body: "Change a priority weight and every open case re-scores live. The preview lists which cases would change band before anything is saved.",
    route: "/admin",
    placement: "top",
  },
  {
    id: "admin-audit",
    anchor: "nav-audit",
    title: "Everything is recorded",
    body: "An append-only trail of every state change, assignment and verification decision, with actor, timestamp and source.",
    route: "/admin",
    placement: "right",
  },
];

export const TOURS: TourDefinition[] = [
  {
    id: "tour_executive",
    name: "Executive tour",
    audience: "EXECUTIVE",
    description: "The position, what drives it, and where to look first.",
    steps: EXECUTIVE_STEPS,
  },
  {
    id: "tour_manager",
    name: "Manager tour",
    audience: "OPS_MANAGER",
    description: "Triage, assignment and the execution inbox.",
    steps: MANAGER_STEPS,
  },
  {
    id: "tour_operator",
    name: "Operator tour",
    audience: "TASK_OWNER",
    description: "Executing a case from plan to hand-off.",
    steps: OPERATOR_STEPS,
  },
  {
    id: "tour_admin",
    name: "Administrator tour",
    audience: "ADMINISTRATOR",
    description: "Integrations, configuration and the audit trail.",
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

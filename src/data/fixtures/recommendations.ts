import type { ExceptionType } from "@/src/domain/types";

/**
 * Recommended-action templates, one set per exception type.
 *
 * Reference data, not generated text: these are the plays a manufacturing
 * operations team already runs, written once so the Action Center recommends
 * the same thing the playbook library would. The wording lives here; how much
 * to trust it on a given case is scored by
 * `src/domain/action-recommendation.ts`.
 *
 * `{supplier}`, `{material}`, `{customer}` and `{plant}` are substituted from
 * the case at build time — the only interpolation, so a template is always
 * readable on its own.
 */

export interface RecommendationTemplate {
  /** Short label for the card header. */
  headline: string;
  /** The action itself, in the imperative. */
  suggestion: string;
  /** Why this play, in one sentence. */
  rationale: string;
  /** What the action becomes if applied. */
  actionTitle: string;
  actionDescription: string;
  icon: string;
}

export const RECOMMENDATION_TEMPLATES: Record<ExceptionType, RecommendationTemplate> = {
  VENDOR_DELAY: {
    headline: "Vendor delay",
    suggestion: "Escalate {supplier} to account management immediately",
    rationale:
      "Repeated date slips are a capacity problem at the vendor, not a transport problem. Another confirmed date is worth less than a written recovery commitment.",
    actionTitle: "Escalate {supplier} to account management",
    actionDescription:
      "Raise the repeat miss with {supplier} account management and request a written capacity commitment covering {material}, not another confirmed date.",
    icon: "TruckElectric",
  },
  MATERIAL_SHORTAGE: {
    headline: "Material shortage",
    suggestion: "Release safety stock and confirm an alternate source for {material}",
    rationale:
      "Coverage is inside the build horizon, so the decision is buy-time-now rather than wait-for-the-original-order.",
    actionTitle: "Secure alternate supply for {material}",
    actionDescription:
      "Release available safety stock against the current build and obtain written lead-time confirmation from an approved alternate source for {material}.",
    icon: "PackageMinus",
  },
  CAPACITY_CONSTRAINT: {
    headline: "Capacity constraint",
    suggestion: "Re-sequence the schedule at {plant} against promised dates",
    rationale:
      "Capacity cannot be added inside the window, so the only lever is which orders take the available hours.",
    actionTitle: "Re-sequence production schedule at {plant}",
    actionDescription:
      "Re-sequence the constrained line at {plant} so confirmed orders closest to their promised date take priority, and confirm the revised plan with planning.",
    icon: "Gauge",
  },
  QUALITY_HOLD: {
    headline: "Quality hold",
    suggestion: "Contain the affected lot and confirm the disposition decision",
    rationale:
      "Quantity at risk grows while a hold sits undispositioned. Containment first, root cause second.",
    actionTitle: "Contain affected lot and record disposition",
    actionDescription:
      "Quarantine the affected {material} lot, confirm the disposition decision with quality, and record the outcome against the case before releasing any stock.",
    icon: "OctagonAlert",
  },
  INVENTORY_EXCESS: {
    headline: "Inventory excess",
    suggestion: "Suspend replenishment for {material} and review the policy",
    rationale:
      "Excess grows every cycle the policy stays unchanged. Stopping the inflow costs nothing and is reversible.",
    actionTitle: "Suspend replenishment and review policy for {material}",
    actionDescription:
      "Suspend the next replenishment cycle for {material} at {plant} and review the reorder policy against the last 90 days of actual consumption.",
    icon: "PackagePlus",
  },
  INVENTORY_STOCKOUT: {
    headline: "Stockout",
    suggestion: "Expedite inbound for {material} and reset the safety-stock level",
    rationale:
      "A stockout that has already happened means the threshold was wrong, not just the order. Fix both or it recurs.",
    actionTitle: "Expedite inbound and reset safety stock for {material}",
    actionDescription:
      "Expedite the open inbound order for {material} and raise the safety-stock threshold so the detection rule fires with enough lead time to act.",
    icon: "PackageX",
  },
  PLANNING_DEVIATION: {
    headline: "Planning deviation",
    suggestion: "Reconcile the plan against actual demand and re-publish",
    rationale:
      "A plan that no longer matches demand quietly corrupts every downstream commitment until it is re-published.",
    actionTitle: "Reconcile and re-publish the plan",
    actionDescription:
      "Reconcile the published plan for {plant} against current confirmed demand, correct the deviation at source, and re-publish to downstream planning.",
    icon: "CalendarSync",
  },
  DELIVERY_AT_RISK: {
    headline: "Delivery at risk",
    suggestion: "Notify {customer} and agree a revised delivery commitment",
    rationale:
      "A miss the customer hears about from you costs a fraction of a miss they discover on the dock.",
    actionTitle: "Notify {customer} and agree a revised commitment",
    actionDescription:
      "Contact {customer} with the current position, agree a revised delivery commitment, and record it against the case before the original promised date passes.",
    icon: "MapPinX",
  },
  OTHER: {
    headline: "Open exception",
    suggestion: "Assign an owner and set a corrective plan",
    rationale:
      "An exception with no owner and no plan is not being worked, whatever its score.",
    actionTitle: "Assign owner and create corrective plan",
    actionDescription:
      "Name an accountable owner for this case and create the first corrective action, so execution can start and be measured.",
    icon: "CircleHelp",
  },
};

/** Substitutes case facts into a template string. */
export function fillTemplate(
  text: string,
  values: { supplier?: string | null; material?: string | null; customer?: string | null; plant: string },
): string {
  return text
    .replace(/\{supplier\}/g, values.supplier ?? "the supplier")
    .replace(/\{material\}/g, values.material ?? "the affected material")
    .replace(/\{customer\}/g, values.customer ?? "the affected customer")
    .replace(/\{plant\}/g, values.plant);
}

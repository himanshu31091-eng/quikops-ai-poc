import type { ExceptionType } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";

/**
 * The playbook library.
 *
 * `PLAYBOOK_STEPS` in `case-detail.ts` already drove corrective-action
 * generation for every case; this promotes it to a first-class library with the
 * metadata a manager needs — owner role, due offset, version, id — and
 * `case-detail.ts` now imports its steps from here.
 *
 * That direction matters: the library shows what a case will actually get,
 * because it is the same data. A library that describes plays the engine does
 * not run is documentation, not configuration.
 */

const DAY_MS = 86_400_000;

export interface PlaybookStep {
  title: string;
  description: string;
  /** Which role normally carries this step. */
  ownerRole: "OPS_MANAGER" | "TASK_OWNER" | "ANALYST";
  /** Days after the case opens that this step is typically due. */
  dueOffsetDays: number;
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  exceptionType: ExceptionType;
  description: string;
  version: string;
  updatedAt: string;
  steps: PlaybookStep[];
}

const ago = (days: number): string =>
  new Date(DEMO_NOW.getTime() - days * DAY_MS).toISOString();

export const PLAYBOOK_LIBRARY: PlaybookDefinition[] = [
  {
    id: "pb_vendor_delay",
    name: "Vendor delivery delay",
    exceptionType: "VENDOR_DELAY",
    description:
      "Confirm, quantify, price the options, escalate. Written for a supplier that has already moved a confirmed date.",
    version: "v3",
    updatedAt: ago(24),
    steps: [
      {
        title: "Confirm the revised date in writing with the supplier",
        description:
          "Obtain a written commitment for the new date and the quantity split, and record who at the supplier gave it.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 1,
      },
      {
        title: "Quantify the coverage gap against confirmed demand",
        description:
          "Net the revised receipt against open demand and identify which orders are exposed and by how many days.",
        ownerRole: "ANALYST",
        dueOffsetDays: 1,
      },
      {
        title: "Price the expedite options",
        description:
          "Compare air freight, partial shipment and an alternate source on cost, lead time and qualification risk.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 2,
      },
      {
        title: "Escalate to supplier account management",
        description:
          "Raise the repeat miss commercially and request a written capacity commitment rather than another date.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 3,
      },
    ],
  },
  {
    id: "pb_material_shortage",
    name: "Critical raw material shortage response",
    exceptionType: "MATERIAL_SHORTAGE",
    description:
      "Written from a polymer-resin shortage case. The first time this was worked it was an improvement action; this is the standard way of responding to it, so the second time is not improvised.",
    version: "v3",
    updatedAt: ago(2),
    steps: [
      {
        title: "Escalate to procurement and confirm the exposure",
        description:
          "Procurement takes the case, confirms which purchase order is affected and states the shortfall in days of coverage against the current build.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 0,
      },
      {
        title: "Obtain written supplier confirmation of the revised date",
        description:
          "A revised dispatch date and quantity split, in writing, with the name of the person at the supplier who gave it. A verbal assurance is not evidence.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 1,
      },
      {
        title: "Reserve a priority quality-release slot for the incoming lot",
        description:
          "Quality books the inspection ahead of routine sampling so the receipt does not clear the gate and then wait. A material delay followed by a release delay is the pattern that turns a supply slip into a missed delivery.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 1,
      },
      {
        title: "Re-sequence production to protect committed orders",
        description:
          "Production reorders the schedule around the confirmed receipt so that the orders closest to their promised date are built first.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 2,
      },
      {
        title: "Assess and communicate customer delivery risk",
        description:
          "Identify which customer orders remain exposed after re-sequencing and agree what, if anything, is told to the customer. Tier-one accounts are told early.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 2,
      },
      {
        title: "Measure the KPI against the captured baseline",
        description:
          "Read OTIF for the affected plant against the baseline captured when the case opened, over the agreed window. Record the reading; do not attribute the movement to this case while other cases are open in the same period.",
        ownerRole: "ANALYST",
        dueOffsetDays: 7,
      },
      {
        title: "Independent verification and close",
        description:
          "A reviewer who did not do the work confirms the evidence and the measured outcome. Only then does the exposure count as recovered.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 9,
      },
    ],
  },
  {
    id: "pb_capacity",
    name: "Capacity constraint",
    exceptionType: "CAPACITY_CONSTRAINT",
    description:
      "Capacity cannot be added inside the window, so the only lever is which orders take the available hours.",
    version: "v2",
    updatedAt: ago(18),
    steps: [
      {
        title: "Re-sequence the constrained line against promised dates",
        description:
          "Order the queue so confirmed orders closest to their promised date take the available hours.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 1,
      },
      {
        title: "Confirm the revised plan with planning",
        description:
          "Publish the revised sequence and confirm downstream commitments against it.",
        ownerRole: "ANALYST",
        dueOffsetDays: 2,
      },
      {
        title: "Notify affected customers of the revised date",
        description:
          "Contact any customer whose promised date moves, before the original date passes.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 3,
      },
    ],
  },
  {
    id: "pb_quality_hold",
    name: "Quality hold",
    exceptionType: "QUALITY_HOLD",
    description:
      "Containment first, root cause second. Quantity at risk grows while a hold sits undispositioned.",
    version: "v4",
    updatedAt: ago(9),
    steps: [
      {
        title: "Quarantine the affected lot",
        description:
          "Physically segregate the affected quantity and block it from further consumption.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 0,
      },
      {
        title: "Confirm the disposition decision with quality",
        description:
          "Agree scrap, rework or use-as-is, and record who authorised it against the case.",
        ownerRole: "OPS_MANAGER",
        dueOffsetDays: 1,
      },
      {
        title: "Raise supplier corrective action",
        description:
          "Where the cause is supplied material, open a formal corrective action with the supplier.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 4,
      },
    ],
  },
  {
    id: "pb_stockout",
    name: "Stockout recovery",
    exceptionType: "INVENTORY_STOCKOUT",
    description:
      "A stockout that has already happened means the threshold was wrong, not just the order. Fix both.",
    version: "v2",
    updatedAt: ago(33),
    steps: [
      {
        title: "Expedite the open inbound order",
        description:
          "Escalate the existing order and confirm the earliest achievable receipt in writing.",
        ownerRole: "TASK_OWNER",
        dueOffsetDays: 0,
      },
      {
        title: "Reset the safety-stock threshold",
        description:
          "Recalculate against the last 90 days of consumption and set the level so detection has lead time.",
        ownerRole: "ANALYST",
        dueOffsetDays: 3,
      },
    ],
  },
];

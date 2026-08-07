import type { UserRole } from "./types";

/**
 * Platform configuration, and the permission model behind it.
 *
 * **Permissions are derived, not declared.** The rules already exist and are
 * already enforced: `ASSIGNABLE_ROLES` decides who can own a case,
 * `NAVIGATION[].roles` decides who reaches a screen, and `reviewerFor` enforces
 * that nobody verifies their own work. A hand-written permission table beside
 * those would be a second description of the same rules — and the moment they
 * disagreed, the table would be the one people believed.
 *
 * So the matrix below is built *from* the capabilities the code enforces, with
 * each row naming the module that owns it. If a rule changes, the matrix
 * changes with it or the reference stops compiling. This is the same argument
 * as D-55 (routing rules derived, not declared), applied one layer up.
 *
 * The three settings groups are configuration *previews* in the sense of D-56:
 * they show what the platform currently does and what changing a value would
 * mean, without pretending a POC can persist it.
 *
 * Framework-free.
 */

/* ---------------------------------------------------------- Permissions --- */

export type CapabilityArea = "Read" | "Execute" | "Approve" | "Configure";

export interface Capability {
  id: string;
  area: CapabilityArea;
  label: string;
  /** Why the rule exists, in the words the product uses elsewhere. */
  rationale: string;
  /** Where it is enforced — the file, so a reader can check rather than trust. */
  enforcedIn: string;
  roles: UserRole[];
}

/**
 * Every capability the product actually gates, and who holds it.
 *
 * Ordered by escalating consequence — read, then act, then approve, then change
 * the rules — because that is the order an auditor asks about them.
 */
export const CAPABILITIES: Capability[] = [
  {
    id: "read.portfolio",
    area: "Read",
    label: "See the whole portfolio",
    rationale:
      "Every signed-in role reads the same figures. There is no per-role version of the truth, which is what lets a review meeting argue about the decision rather than about whose number is right.",
    enforcedIn: "src/data/queries/*",
    roles: ["EXECUTIVE", "OPS_MANAGER", "TASK_OWNER", "ANALYST", "ADMINISTRATOR"],
  },
  {
    id: "read.admin",
    area: "Read",
    label: "Reach Administration",
    rationale:
      "Configuration is visible to the roles accountable for it. An operator seeing the priority weights would invite argument about scoring in the middle of executing work.",
    enforcedIn: "src/config/app-config.ts → NAVIGATION[].roles",
    roles: ["ADMINISTRATOR", "OPS_MANAGER", "EXECUTIVE"],
  },
  {
    id: "execute.own",
    area: "Execute",
    label: "Own a case",
    rationale:
      "Executives sponsor work; they do not own it. An unowned case cannot move, and an executive named as owner is an unowned case with a name on it.",
    enforcedIn: "src/data/queries/case-mapper.ts → ASSIGNABLE_ROLES",
    roles: ["OPS_MANAGER", "TASK_OWNER", "ANALYST"],
  },
  {
    id: "execute.assign",
    area: "Execute",
    label: "Assign and reassign",
    rationale:
      "Anyone who can own work can hand it on, so a blocked owner is never a dead end. Routing rules already name a default, which makes most assignment a confirmation.",
    enforcedIn: "components/patterns/assign-menu.tsx",
    roles: ["OPS_MANAGER", "TASK_OWNER", "ANALYST"],
  },
  {
    id: "execute.evidence",
    area: "Execute",
    label: "Attach evidence",
    rationale:
      "Evidence is what turns a claim into a verifiable outcome, so whoever did the work attaches it. A reviewer who supplies the evidence is reviewing themselves.",
    enforcedIn: "features/case-detail/components/evidence-card.tsx",
    roles: ["OPS_MANAGER", "TASK_OWNER", "ANALYST"],
  },
  {
    id: "approve.verify",
    area: "Approve",
    label: "Verify another person's work",
    rationale:
      "A second pair of eyes, always. The owner cannot verify their own case — and verification is the only route by which exposure counts as recovered, so this is the single most consequential permission in the product.",
    enforcedIn: "src/data/fixtures/case-detail.ts → reviewerFor",
    roles: ["OPS_MANAGER", "ADMINISTRATOR"],
  },
  {
    id: "approve.close",
    area: "Approve",
    label: "Close a case administratively",
    rationale:
      "Closing removes a case from the queue and recovers nothing. It is deliberately separate from verifying, because the two look identical on a dashboard and mean opposite things.",
    enforcedIn: "src/workflow/projections.ts → revenueMovement",
    roles: ["OPS_MANAGER", "ADMINISTRATOR"],
  },
  {
    id: "configure.weights",
    area: "Configure",
    label: "Change priority weights and SLA targets",
    rationale:
      "Re-scores every open case. The preview lists which cases would change band before anything is applied, because a scoring change nobody can see the consequences of is a change nobody should make.",
    enforcedIn: "src/domain/config-preview.ts",
    roles: ["ADMINISTRATOR"],
  },
  {
    id: "configure.users",
    area: "Configure",
    label: "Manage users and roles",
    rationale:
      "Role decides who can own, verify and configure, so this is the permission that grants the others.",
    enforcedIn: "src/data/queries/administration.ts",
    roles: ["ADMINISTRATOR"],
  },
];

export const CAPABILITY_AREAS: CapabilityArea[] = [
  "Read",
  "Execute",
  "Approve",
  "Configure",
];

/** Capabilities a role holds — the row a person reads about themselves. */
export function capabilitiesFor(role: UserRole): Capability[] {
  return CAPABILITIES.filter((capability) => capability.roles.includes(role));
}

/** Roles holding a capability — the column an auditor reads. */
export function rolesWith(capabilityId: string): UserRole[] {
  return CAPABILITIES.find((entry) => entry.id === capabilityId)?.roles ?? [];
}

/* ---------------------------------------------------------- Departments --- */

/**
 * The functional teams work is routed to.
 *
 * Deliberately hung off the *user*, not the case. A case belongs to a person,
 * and that person belongs to a team — so department performance is derivable by
 * joining through the owner, and no case needs a field it would have to be
 * given by hand across the corpus.
 *
 * That join has one honest limit, stated wherever the figures appear: an
 * unowned case has no department. It is counted in the portfolio and absent
 * from the departmental split, which is correct — nobody is accountable for it
 * yet, and that is itself the finding.
 */
export interface Department {
  id: string;
  name: string;
  /** What this team is accountable for, in one line. */
  remit: string;
  /** Which exception types normally route here. */
  handles: string[];
  icon: string;
}

export const DEPARTMENTS: Department[] = [
  {
    id: "dept_supply",
    name: "Supply Chain",
    remit: "Inbound material, supplier commitments and coverage against demand.",
    handles: ["VENDOR_DELAY", "MATERIAL_SHORTAGE", "INVENTORY_STOCKOUT"],
    icon: "TruckElectric",
  },
  {
    id: "dept_production",
    name: "Production",
    remit: "Line capacity, schedule adherence and the work order itself.",
    handles: ["CAPACITY_CONSTRAINT", "PLANNING_DEVIATION"],
    icon: "Factory",
  },
  {
    id: "dept_quality",
    name: "Quality",
    remit: "Containment, disposition and supplier corrective action.",
    handles: ["QUALITY_HOLD"],
    icon: "ShieldCheck",
  },
  {
    id: "dept_logistics",
    name: "Logistics",
    remit: "Outbound movement and the promised date the customer holds.",
    handles: ["DELIVERY_AT_RISK", "INVENTORY_EXCESS"],
    icon: "Boxes",
  },
];

/**
 * Which team a person sits in, inferred from their job title.
 *
 * Inference rather than a stored field, for the same reason the routing rules
 * are derived (D-55): the seeded organisation already states each person's
 * function in their title, and adding a second place to say it would let the
 * two disagree. The mapping is explicit and small enough to read.
 */
export function departmentForJobTitle(jobTitle: string): Department | null {
  const title = jobTitle.toLowerCase();

  if (/procure|supply|material|buyer|sourcing/.test(title)) {
    return DEPARTMENTS[0] ?? null;
  }
  if (/produc|planner|planning|manufactur|plant operations/.test(title)) {
    return DEPARTMENTS[1] ?? null;
  }
  if (/quality|inspect/.test(title)) {
    return DEPARTMENTS[2] ?? null;
  }
  if (/logistic|warehouse|distribut|transport/.test(title)) {
    return DEPARTMENTS[3] ?? null;
  }
  return null;
}

/* ------------------------------------------------------------- Settings --- */

export interface SettingRow {
  key: string;
  label: string;
  value: string;
  /** What this setting actually controls, and what changing it would cost. */
  detail: string;
  /** True when the value is enforced in code rather than merely displayed. */
  isEnforced: boolean;
}

export interface SettingsGroup {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  rows: SettingRow[];
  /** Stated plainly under every group in a POC without persistence. */
  note: string;
}

/**
 * The three configuration surfaces, each showing what the platform does today.
 *
 * Values are read from the modules that own them rather than restated, so this
 * screen cannot describe a system the code is not running — the failure mode a
 * settings page normally has.
 */
export function buildSettingsGroups(input: {
  copilotModel: string;
  copilotEffort: string;
  copilotMaxTokens: number;
  maxQuestionChars: number;
  maxHistoryTurns: number;
  maxContextChars: number;
  isLiveMode: boolean;
  measurementWindowDays: number;
  slaTargets: Record<string, number>;
}): SettingsGroup[] {
  return [
    {
      id: "ai",
      title: "AI settings",
      subtitle: "What the Copilot runs, and the bounds it runs inside",
      icon: "Bot",
      note: "Read from src/ai/config.ts. Changing a bound here would change what reaches the model, which is why they are shown rather than edited in this build.",
      rows: [
        {
          key: "model",
          label: "Model",
          value: input.copilotModel,
          detail:
            "Used at both scopes — portfolio and case. The panel, transport and error handling are identical either way.",
          isEnforced: true,
        },
        {
          key: "mode",
          label: "Mode",
          value: input.isLiveMode ? "Live" : "Demo AI (offline responder)",
          detail: input.isLiveMode
            ? "ANTHROPIC_API_KEY is present and read only inside the route handler. It never reaches the browser."
            : "No API key configured. Answers come from the same case record through a keyword-routed responder, and the panel says so.",
          isEnforced: true,
        },
        {
          key: "effort",
          label: "Reasoning effort",
          value: input.copilotEffort,
          detail:
            "Raising it improves multi-step answers and costs latency the demo can feel. Medium is the tested setting.",
          isEnforced: true,
        },
        {
          key: "maxTokens",
          label: "Response ceiling",
          value: `${input.copilotMaxTokens.toLocaleString()} tokens`,
          detail: "A ceiling, not a target. Most answers finish well inside it.",
          isEnforced: true,
        },
        {
          key: "question",
          label: "Question limit",
          value: `${input.maxQuestionChars.toLocaleString()} characters`,
          detail:
            "Anything longer is rejected with a 413 before it reaches the model. Sanitisation strips control characters and forged section markers.",
          isEnforced: true,
        },
        {
          key: "history",
          label: "Conversation memory",
          value: `${input.maxHistoryTurns} turns`,
          detail:
            "Older turns are dropped rather than summarised. A longer window costs input tokens on every subsequent question.",
          isEnforced: true,
        },
        {
          key: "context",
          label: "Case context budget",
          value: `${(input.maxContextChars / 1000).toFixed(0)}k characters`,
          detail:
            "The assembled record is trimmed from the middle when it exceeds this, and the prompt says that it was.",
          isEnforced: true,
        },
      ],
    },
    {
      id: "workflow",
      title: "Workflow settings",
      subtitle: "The rules the execution model enforces",
      icon: "ListChecks",
      note: "Enforced in src/domain and src/workflow. These are invariants rather than preferences — changing them changes what the product means by a resolved case.",
      rows: [
        {
          key: "verification",
          label: "Verification required",
          value: "Always, by a second person",
          detail:
            "The owner cannot verify their own work. Exposure is recovered on verification and never on closure.",
          isEnforced: true,
        },
        {
          key: "status",
          label: "Status derivation",
          value: "From action completion",
          detail:
            "Owners report a percentage; the status follows it. Nobody types a status, which is what lets the queue be read as a measure of where work actually is.",
          isEnforced: true,
        },
        {
          key: "escalation",
          label: "Escalation trigger",
          value: "On SLA breach",
          detail:
            "Breaching a band target escalates the case above its owner. Levels 1 to 3 map to manager, plant lead and executive sponsor.",
          isEnforced: true,
        },
        {
          key: "window",
          label: "Measurement window",
          value: `${input.measurementWindowDays} days`,
          detail:
            "A case is not durably closed until the measured KPI has held for this long after verification.",
          isEnforced: true,
        },
        {
          key: "sla",
          label: "SLA targets",
          value: Object.entries(input.slaTargets)
            .map(([band, hours]) => `${band.toLowerCase()} ${hours}h`)
            .join(" · "),
          detail:
            "Editable above, with a preview of which open cases would change breach state before anything is applied.",
          isEnforced: true,
        },
      ],
    },
    {
      id: "notifications",
      title: "Notification settings",
      subtitle: "What the platform would tell people, and when",
      icon: "Bell",
      note: "The tray is populated from seeded events in this build; delivery to email and Teams is a Phase-2 integration. Shown so the routing rules can be agreed before the transport exists.",
      rows: [
        {
          key: "assignment",
          label: "Case assigned to you",
          value: "In-app · immediate",
          detail:
            "The one notification that always fires: an unowned case cannot move, so the hand-off has to land.",
          isEnforced: true,
        },
        {
          key: "breach",
          label: "SLA breach imminent",
          value: "In-app · 4 hours before target",
          detail:
            "Before, not after. A breach notification that arrives at the breach is a record, not a warning.",
          isEnforced: false,
        },
        {
          key: "verification",
          label: "Awaiting your verification",
          value: "In-app · immediate",
          detail:
            "Work already finished sits in the at-risk pool until a reviewer signs it off, so this queue is worth interrupting for.",
          isEnforced: true,
        },
        {
          key: "escalation",
          label: "Escalated to you",
          value: "In-app · immediate",
          detail:
            "An escalation with no notification is a queue nobody knows they own.",
          isEnforced: false,
        },
        {
          key: "digest",
          label: "Daily digest",
          value: "Email · 07:00 local",
          detail:
            "Open position, what breached overnight, and what needs a decision today. Requires the Phase-2 mail transport.",
          isEnforced: false,
        },
      ],
    },
  ];
}

import type {
  ActionStatus,
  CaseAuditEntry,
  CaseStatus,
  DetectionSource,
  ExceptionType,
  PriorityBand,
  KpiKey,
  UserRole,
} from "@/src/domain/types";

export const APP = {
  name: "QuikOps AI",
  tagline: "Operational Execution Platform",
  vendor: "MoreYeahs",
  version: "0.9.0-poc",
  environment: "Demo",
} as const;

/* ---------------------------------------------------------------- Navigation */

export type NavPhase = "LIVE" | "PHASE_2";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  phase: NavPhase;
  badgeKey?: "unassigned" | "myOpen" | "approvals" | "breaches";
  roles: UserRole[];
}

export interface NavSection {
  key: string;
  label: string | null;
  items: NavItem[];
}

const ALL_ROLES: UserRole[] = [
  "EXECUTIVE",
  "OPS_MANAGER",
  "TASK_OWNER",
  "ANALYST",
  "ADMINISTRATOR",
];

export const NAVIGATION: NavSection[] = [
  {
    key: "operate",
    label: null,
    items: [
      {
        key: "dashboard",
        label: "Executive Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
      {
        key: "my-work",
        label: "My Work",
        href: "/my-work",
        icon: "CircleCheck",
        phase: "LIVE",
        badgeKey: "myOpen",
        roles: ALL_ROLES,
      },
      {
        key: "work",
        label: "Work Manager",
        href: "/work",
        icon: "Rows3",
        phase: "LIVE",
        badgeKey: "unassigned",
        roles: ALL_ROLES,
      },
      {
        key: "actions",
        label: "Action Center",
        href: "/actions",
        icon: "ListChecks",
        phase: "LIVE",
        badgeKey: "approvals",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    key: "improve",
    label: "Improve",
    items: [
      {
        key: "analytics",
        label: "Execution Analytics",
        href: "/analytics",
        icon: "ChartNoAxesColumn",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
      {
        key: "playbooks",
        label: "Playbooks",
        href: "/playbooks",
        icon: "BookMarked",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
      {
        key: "reports",
        label: "Reports",
        href: "/reports",
        icon: "FileText",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      {
        key: "connectors",
        label: "Connector Health",
        href: "/system/connectors",
        icon: "PlugZap",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
      {
        key: "audit",
        label: "Audit Log",
        href: "/system/audit",
        icon: "ScrollText",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
      {
        key: "help",
        label: "Help Center",
        href: "/help",
        icon: "CircleHelp",
        phase: "LIVE",
        roles: ALL_ROLES,
      },
      {
        key: "admin",
        label: "Administration",
        href: "/admin",
        icon: "Settings2",
        phase: "LIVE",
        roles: ["ADMINISTRATOR", "OPS_MANAGER", "EXECUTIVE"],
      },
    ],
  },
];

/**
 * Where a persona lands when they sign in.
 *
 * Every route here is a `NAVIGATION` href the role can already reach — this
 * table only decides which of them the role opens the day with, so signing in
 * as an owner does not drop them on an executive dashboard. `ANALYST` shares
 * the manager's landing because an analyst investigates from the same queue.
 */
export const ROLE_LANDING: Record<UserRole, string> = {
  EXECUTIVE: "/dashboard",
  OPS_MANAGER: "/work",
  TASK_OWNER: "/my-work",
  ANALYST: "/work",
  ADMINISTRATOR: "/admin",
};

/* ------------------------------------------------------------------- Labels */

interface TokenSet {
  label: string;
  /** Tailwind classes composed exclusively from semantic design tokens. */
  className: string;
  dotClassName: string;
}

export const CASE_STATUS_META: Record<CaseStatus, TokenSet> = {
  NEW: {
    label: "New",
    className: "bg-status-new-subtle text-status-new border-status-new-line",
    dotClassName: "bg-status-new",
  },
  TRIAGED: {
    label: "Triaged",
    className: "bg-status-triaged-subtle text-status-triaged border-status-triaged-line",
    dotClassName: "bg-status-triaged",
  },
  ASSIGNED: {
    label: "Assigned",
    className: "bg-status-assigned-subtle text-status-assigned border-status-assigned-line",
    dotClassName: "bg-status-assigned",
  },
  IN_PROGRESS: {
    label: "In progress",
    className: "bg-status-progress-subtle text-status-progress border-status-progress-line",
    dotClassName: "bg-status-progress",
  },
  PENDING_VERIFY: {
    label: "Pending verification",
    className: "bg-status-verify-subtle text-status-verify border-status-verify-line",
    dotClassName: "bg-status-verify",
  },
  VERIFIED: {
    label: "Verified",
    className: "bg-status-verified-subtle text-status-verified border-status-verified-line",
    dotClassName: "bg-status-verified",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-status-closed-subtle text-status-closed border-status-closed-line",
    dotClassName: "bg-status-closed",
  },
  DISMISSED: {
    label: "Dismissed",
    className: "bg-surface text-content-tertiary border-line-strong",
    dotClassName: "bg-content-tertiary",
  },
  REOPENED: {
    label: "Reopened",
    className: "bg-surface text-status-new border-status-new-line",
    dotClassName: "bg-status-new",
  },
};

export const PRIORITY_META: Record<PriorityBand, TokenSet & { railClassName: string }> = {
  CRITICAL: {
    label: "Critical",
    className: "bg-critical-subtle text-critical-content border-critical-line",
    dotClassName: "bg-critical",
    railClassName: "bg-critical",
  },
  HIGH: {
    label: "High",
    className: "bg-high-subtle text-high-content border-high-line",
    dotClassName: "bg-high",
    railClassName: "bg-high",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-medium-subtle text-medium-content border-medium-line",
    dotClassName: "bg-medium",
    railClassName: "bg-medium",
  },
  LOW: {
    label: "Low",
    className: "bg-low-subtle text-low-content border-low-line",
    dotClassName: "bg-low",
    railClassName: "bg-low",
  },
};

export const EXCEPTION_META: Record<ExceptionType, { label: string; icon: string }> = {
  VENDOR_DELAY: { label: "Vendor delay", icon: "TruckElectric" },
  MATERIAL_SHORTAGE: { label: "Material shortage", icon: "PackageMinus" },
  CAPACITY_CONSTRAINT: { label: "Capacity constraint", icon: "Gauge" },
  QUALITY_HOLD: { label: "Quality hold", icon: "OctagonAlert" },
  INVENTORY_EXCESS: { label: "Inventory excess", icon: "PackagePlus" },
  INVENTORY_STOCKOUT: { label: "Stockout", icon: "PackageX" },
  PLANNING_DEVIATION: { label: "Planning deviation", icon: "CalendarSync" },
  DELIVERY_AT_RISK: { label: "Delivery at risk", icon: "MapPinX" },
  OTHER: { label: "Other", icon: "CircleHelp" },
};

export const DETECTION_SOURCE_META: Record<
  DetectionSource,
  { label: string; shortLabel: string; icon: string; description: string }
> = {
  EVERY_ANGLE: {
    label: "Enterprise Data Platform",
    shortLabel: "Data Platform",
    icon: "PlugZap",
    description: "Raised automatically from an enterprise data platform signal",
  },
  PLAYBOOK_MONITOR: {
    label: "Playbook monitor",
    shortLabel: "Playbook",
    icon: "BookMarked",
    description: "Raised by a playbook's recurrence or threshold monitor",
  },
  MANUAL: {
    label: "Raised manually",
    shortLabel: "Manual",
    icon: "UserCog",
    description: "Opened by hand from the plant floor or a review meeting",
  },
};

/**
 * What a user reads where an audit entry's source is shown. The enum keys are
 * internal identifiers; deriving display text from them by de-underscoring
 * leaked the upstream vendor's name into the Audit Log and its exports.
 */
export const AUDIT_SOURCE_LABEL: Record<CaseAuditEntry["source"], string> = {
  EVERY_ANGLE: "Data platform",
  RULE_ENGINE: "Rule engine",
  WORK_MANAGER: "Work Manager",
  CASE_DETAIL: "Case detail",
  API: "API",
};

/**
 * What a user reads where a stored audit event is shown.
 *
 * The persisted `event` is a dotted identifier — "case.assigned" — chosen so it
 * stays stable while the wording on screen changes. It is not display text, and
 * rendering it raw would put a machine key in the column a quality auditor
 * reads. Same rule as `AUDIT_SOURCE_LABEL` above.
 */
export const AUDIT_EVENT_LABEL: Record<string, string> = {
  "case.created": "Case created and scored",
  "case.triaged": "Case triaged",
  "case.assigned": "Owner changed",
  "case.status": "Status changed",
  "case.priority": "Priority changed",
  "case.due": "Due date changed",
  "case.escalated": "Escalated",
  "case.reopened": "Case reopened",
  "case.closed": "Case closed",
  "case.dismissed": "Case dismissed",
  "action.added": "Action added",
  "action.updated": "Action updated",
  "action.completed": "Action completed",
  "action.removed": "Action removed",
  "evidence.added": "Evidence uploaded",
  "evidence.removed": "Evidence removed",
  "comment.added": "Comment added",
  "playbook.applied": "Playbook applied",
  "sla.breached": "SLA breached",
  "priority.computed": "Priority score computed",
  "verification.requested": "Verification requested",
  "verification.decided": "Verification decision recorded",
  "user.created": "User created",
  "user.updated": "User updated",
};

/**
 * The label for a stored event, or a readable sentence built from the key when
 * the event is one this build has no wording for yet. A missing label is a copy
 * gap, not a reason to show the reader nothing.
 */
export function auditEventLabel(event: string): string {
  const known = AUDIT_EVENT_LABEL[event];
  if (known) return known;
  const words = event.replace(/[._-]+/g, " ").trim();
  if (words.length === 0) return "Recorded change";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const ACTION_STATUS_META: Record<ActionStatus, TokenSet> = {
  TODO: {
    label: "To do",
    className: "bg-surface-hover text-content-secondary border-line",
    dotClassName: "bg-content-tertiary",
  },
  IN_PROGRESS: {
    label: "In progress",
    className: "bg-status-progress-subtle text-status-progress border-status-progress-line",
    dotClassName: "bg-status-progress",
  },
  BLOCKED: {
    label: "Blocked",
    className: "bg-critical-subtle text-critical-content border-critical-line",
    dotClassName: "bg-critical",
  },
  DONE: {
    label: "Done",
    className: "bg-success-subtle text-success-content border-success-line",
    dotClassName: "bg-success",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-surface text-content-tertiary border-line",
    dotClassName: "bg-content-tertiary",
  },
};

/**
 * What a KPI is called where a user reads it.
 *
 * The enum keys are identifiers, not copy. De-underscoring one produced
 * "otif pct" on the verification card — the same defect class as deriving an
 * audit source label from its key. Display text comes from here.
 */
export const KPI_LABEL: Record<KpiKey, string> = {
  OTIF_PCT: "on-time in full",
  REVENUE_AT_RISK: "revenue at risk",
  INVENTORY_DAYS: "inventory days of cover",
  SUPPLIER_OTD_PCT: "supplier on-time delivery",
  SCHEDULE_ADHERENCE_PCT: "schedule adherence",
  FORECAST_ACCURACY_PCT: "forecast accuracy",
};

export const ROLE_META: Record<UserRole, { label: string; short: string }> = {
  EXECUTIVE: { label: "Executive", short: "Exec" },
  OPS_MANAGER: { label: "Operations Manager", short: "Ops" },
  TASK_OWNER: { label: "Task Owner", short: "Owner" },
  ANALYST: { label: "Supply Chain Analyst", short: "Analyst" },
  ADMINISTRATOR: { label: "Administrator", short: "Admin" },
};

import type {
  ActionStatus,
  CaseStatus,
  DetectionSource,
  ExceptionType,
  PriorityBand,
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
        phase: "PHASE_2",
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
        phase: "PHASE_2",
        roles: ALL_ROLES,
      },
      {
        key: "playbooks",
        label: "Playbooks",
        href: "/playbooks",
        icon: "BookMarked",
        phase: "PHASE_2",
        roles: ALL_ROLES,
      },
      {
        key: "reports",
        label: "Reports",
        href: "/reports",
        icon: "FileText",
        phase: "PHASE_2",
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
        phase: "PHASE_2",
        roles: ALL_ROLES,
      },
      {
        key: "audit",
        label: "Audit Log",
        href: "/system/audit",
        icon: "ScrollText",
        phase: "PHASE_2",
        roles: ALL_ROLES,
      },
      {
        key: "admin",
        label: "Administration",
        href: "/admin",
        icon: "Settings2",
        phase: "PHASE_2",
        roles: ["ADMINISTRATOR", "OPS_MANAGER", "EXECUTIVE"],
      },
    ],
  },
];

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
    label: "Every Angle",
    shortLabel: "Every Angle",
    icon: "PlugZap",
    description: "Raised automatically from an Every Angle signal",
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

export const ROLE_META: Record<UserRole, { label: string; short: string }> = {
  EXECUTIVE: { label: "Executive", short: "Exec" },
  OPS_MANAGER: { label: "Operations Manager", short: "Ops" },
  TASK_OWNER: { label: "Task Owner", short: "Owner" },
  ANALYST: { label: "Supply Chain Analyst", short: "Analyst" },
  ADMINISTRATOR: { label: "Administrator", short: "Admin" },
};

/* --------------------------------------------------------------- Placeholders */

export const MODULE_PLACEHOLDER_COPY: Record<
  string,
  { title: string; scope: string; specRef: string; icon: string }
> = {
  actions: {
    title: "Action Center",
    scope:
      "Cross-case approval queue for corrective actions requiring manager sign-off before execution, with overdue and escalation views.",
    specRef: "Architecture Proposal §6 — Module M3",
    icon: "ListChecks",
  },
  analytics: {
    title: "Execution Analytics",
    scope:
      "Mean time to resolve, SLA adherence, verification pass rate and recurrence rate by plant, owner and exception type.",
    specRef: "Architecture Proposal §6 — Module M8",
    icon: "ChartNoAxesColumn",
  },
  playbooks: {
    title: "Playbook Library",
    scope:
      "Reusable corrective-action templates per exception type, with usage counts, average resolution time and effectiveness.",
    specRef: "Architecture Proposal §6 — Module M6",
    icon: "BookMarked",
  },
  reports: {
    title: "Reports",
    scope:
      "Scheduled executive and audit reporting with PDF and Excel distribution to stakeholder lists.",
    specRef: "Architecture Proposal §6 — Module M13",
    icon: "FileText",
  },
  connectors: {
    title: "Connector Health",
    scope:
      "Every Angle ingestion status, run history, deduplication counts and dead-letter replay for failed signals.",
    specRef: "Architecture Proposal §6 — Module M1",
    icon: "PlugZap",
  },
  audit: {
    title: "Audit Log",
    scope:
      "Append-only record of every state change, assignment, verification decision and configuration edit, with actor and timestamp.",
    specRef: "Architecture Proposal §6 — Module M11",
    icon: "ScrollText",
  },
  admin: {
    title: "Administration",
    scope:
      "Users, roles, plant scoping, assignment routing rules, SLA thresholds and priority weight configuration.",
    specRef: "Architecture Proposal §6 — Module M12",
    icon: "Settings2",
  },
};

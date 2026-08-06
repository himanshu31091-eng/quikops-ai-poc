import type { ActionSlaState, DeadlineBucket } from "@/src/domain/action-sla";
import type {
  ActionStatus,
  CorrectiveAction,
  PriorityBand,
} from "@/src/domain/types";
import type { ActionCaseContext } from "@/src/data/queries/actions";

/**
 * Action Center contracts.
 *
 * Everything the module renders is a pure function of `ActionFilters` plus the
 * action array, which is what lets the KPI cards, the queue, the deadline
 * timeline and the recommendation panel derive from one memoised pass and never
 * disagree with each other.
 */

export type ActionSortKey =
  | "priority"
  | "case"
  | "action"
  | "owner"
  | "due"
  | "sla"
  | "status";

export type SortDirection = "asc" | "desc";

export interface ActionSort {
  key: ActionSortKey;
  direction: SortDirection;
}

/** Sentinel owner value — actions nobody holds are the ones that slip. */
export const UNASSIGNED_OWNER = "UNASSIGNED";

/** The multi-select facets. Named so the menus and the hook agree on one union. */
export type ActionFilterField = "plants" | "priorities" | "statuses" | "owners";

/** The preset views the KPI tiles switch between. */
export type ActionScope =
  | "all"
  | "assigned"
  | "overdue"
  | "breaches"
  | "approvals"
  | "escalations"
  | "completed";

export interface ActionFilters {
  search: string;
  plants: string[];
  priorities: PriorityBand[];
  statuses: ActionStatus[];
  owners: string[];
  scope: ActionScope;
}

export const EMPTY_ACTION_FILTERS: ActionFilters = {
  search: "",
  plants: [],
  priorities: [],
  statuses: [],
  owners: [],
  scope: "all",
};

/**
 * An action with everything the queue, the timeline and the drawer need
 * precomputed once — SLA state, deadline bucket, case context, search haystack.
 */
export interface ActionRow extends CorrectiveAction {
  context: ActionCaseContext;
  slaState: ActionSlaState;
  deadlineBucket: DeadlineBucket | null;
  /** Hours until due; negative once past. Null once complete. */
  hoursUntilDue: number | null;
  isOpen: boolean;
  isOverdue: boolean;
  /** Awaiting manager sign-off — the approvals queue. */
  awaitingApproval: boolean;
  /** The case has been escalated above its owner. */
  isEscalated: boolean;
  /** Completed within the current demo day. */
  completedToday: boolean;
  ownerName: string;
  /** Carries an unsaved change made in this session. */
  isDirty: boolean;
  /** Lower-cased search haystack, built once per row. */
  haystack: string;
}

export interface ActionKpi {
  key: "assigned" | "overdue" | "breaches" | "approvals";
  label: string;
  value: number;
  footnote: string;
  icon: string;
  tone: "neutral" | "accent" | "critical" | "high" | "success";
  /** The scope this tile switches to, and whether it is currently applied. */
  scope: ActionScope;
  active: boolean;
}

export interface DeadlineGroup {
  bucket: DeadlineBucket;
  label: string;
  tone: "critical" | "high" | "medium" | "neutral";
  actions: ActionRow[];
}

export interface ActiveFilterChip {
  id: string;
  group: string;
  label: string;
}

/** Fields the Create Action dialog collects. */
export interface NewActionDraft {
  caseNo: string;
  title: string;
  description: string;
  ownerId: string;
  dueInDays: string;
}

/** A change made to an action in this session, applied over the server data. */
export interface ActionOverride {
  status?: ActionStatus;
  ownerId?: string;
  completedAt?: string | null;
  completionPct?: number;
  dueAt?: string;
}

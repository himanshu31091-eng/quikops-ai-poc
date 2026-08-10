/**
 * In-app tips — the smallest unit of documentation.
 *
 * Three kinds, deliberately distinct, because conflating them is how a product
 * ends up with help nobody reads:
 *
 * - **Term** — hover help on a word whose meaning is precise in this product
 *   and vague outside it (*health* is not *priority*; *recovered* is not
 *   *closed*). Always available, never dismissed, because a definition is
 *   needed at the moment of doubt rather than once.
 * - **First use** — one callout per screen, on first arrival, saying what the
 *   screen is for. Dismissed permanently.
 * - **Announcement** — what changed in this release. Dismissed permanently,
 *   keyed by version so a later release can speak again.
 *
 * The previous attempt at this (`FirstUseHint`) was removed in D-63 because it
 * was written and never mounted. The lesson is recorded here rather than in the
 * component: a hint system is only real when a screen subscribes to it, so every
 * key below is referenced from a screen, and the audit script checks that.
 *
 * Framework-free. `useTips` owns the persistence.
 */

export type TipKind = "term" | "first-use" | "announcement";

export interface Tip {
  id: string;
  kind: TipKind;
  title: string;
  body: string;
  /** Optional pointer into the Help Centre for the long version. */
  learnMoreHref?: string;
}

/**
 * Terms whose meaning is load-bearing.
 *
 * Sourced from the domain vocabulary rather than restated, so a definition here
 * and the behaviour in `src/domain` cannot drift: each one names the module that
 * owns the rule.
 */
export const TERM_TIPS: Record<string, Tip> = {
  priority: {
    id: "term.priority",
    kind: "term",
    title: "Priority",
    body: "Scored 0–100 by a deterministic rule set, never by a model — revenue at risk, KPI deviation, customer tier, days to promised date, recurrence and escalation. An unexplainable priority is an ignored priority, so every score can be opened and defended.",
    learnMoreHref: "/help",
  },
  health: {
    id: "term.health",
    kind: "term",
    title: "Execution health",
    body: "Whether the work is actually moving, scored separately from priority. Priority says how much a case matters; health says whether anyone is making progress on it. A critical case can be perfectly healthy, and a low one can be stalled.",
    learnMoreHref: "/help",
  },
  sla: {
    id: "term.sla",
    kind: "term",
    title: "SLA target",
    body: "Resolution target by band — critical 24 hours, high 72, medium 240, low 720. Breaching escalates the case above its owner. The target is measured from detection to verification, not to closure.",
    learnMoreHref: "/help",
  },
  revenueAtRisk: {
    id: "term.revenueAtRisk",
    kind: "term",
    title: "Revenue at risk",
    body: "The value of confirmed demand that cannot be served if the condition is not cleared before the promised date. It is exposure, not a loss already taken — and it leaves the pool only on verification.",
    learnMoreHref: "/help",
  },
  recovered: {
    id: "term.recovered",
    kind: "term",
    title: "Recovered revenue",
    body: "Exposure that has moved out of the at-risk pool. Verification is the only route to it: closing a case administratively removes it from the queue and recovers nothing. This is the invariant the whole execution model rests on.",
    learnMoreHref: "/help",
  },
  verification: {
    id: "term.verification",
    kind: "term",
    title: "Verification",
    body: "A second pair of eyes. The owner cannot verify their own work — a reviewer approves, rejects, or sends it back. Nothing counts as delivered until someone other than the person who did it says so.",
    learnMoreHref: "/help",
  },
  recurrence: {
    id: "term.recurrence",
    kind: "term",
    title: "Recurrence",
    body: "The same condition detected again. A stronger signal than a new case: it means the previous corrective action did not hold, so resolving it the same way buys one cycle rather than fixing anything.",
    learnMoreHref: "/playbooks",
  },
  flowBalance: {
    id: "term.flowBalance",
    kind: "term",
    title: "Flow balance",
    body: "What arrived against what left, over a window. Opening plus detected minus resolved equals the closing balance exactly. It answers whether the operation is gaining on its backlog — which the open count alone cannot.",
    learnMoreHref: "/analytics",
  },
  detectionSource: {
    id: "term.detectionSource",
    kind: "term",
    title: "Detection source",
    body: "Where the case came from — the connected enterprise data platform for the overwhelming majority, a playbook's own monitoring rule, or opened by hand from the floor. It is how you tell an automated signal from a human judgement.",
    learnMoreHref: "/system/connectors",
  },
};

/** One per screen, on first arrival. Keyed to the same slugs as `SCREEN_DOCS`. */
export const FIRST_USE_TIPS: Record<string, Tip> = {
  dashboard: {
    id: "first.dashboard",
    kind: "first-use",
    title: "Every number here is a link",
    body: "The KPI cards, the plant rows and the bottleneck table all open the cases behind them already filtered. Nothing on this screen is a dead end.",
  },
  work: {
    id: "first.work",
    kind: "first-use",
    title: "The queue remembers where you were",
    body: "Filters, sort and view round-trip through the URL, so any view you build here can be shared as a link or kept as a saved view.",
  },
  analytics: {
    id: "first.analytics",
    kind: "first-use",
    title: "Flow answers a different question",
    body: "The charts above tell you how the operation performed. The flow region below tells you whether it is gaining — and when the backlog clears at the current rate.",
    learnMoreHref: "/help",
  },
  actions: {
    id: "first.actions",
    kind: "first-use",
    title: "Progress drives status, not the other way round",
    body: "Report a percentage and the status follows it. You never type a status here, which is why the queue can be trusted as a measure of where the work actually is.",
  },
  connectors: {
    id: "first.connectors",
    kind: "first-use",
    title: "Not every failure can be replayed",
    body: "A dead-letter message rejected for a schema mismatch will fail again identically. Those are marked, and the replay is refused rather than pretending.",
  },
  admin: {
    id: "first.admin",
    kind: "first-use",
    title: "Configuration shows its consequences",
    body: "Change a priority weight and every open case re-scores live, listing which ones would change band — before anything is saved.",
  },
};

/**
 * What changed, for someone returning to a product they have seen before.
 *
 * Keyed by release: bumping `CURRENT_RELEASE` is what lets the product speak
 * again, and it is the only thing that should.
 */
export const CURRENT_RELEASE = "2026.08";

export const ANNOUNCEMENT_TIPS: Tip[] = [
  {
    id: `announce.${CURRENT_RELEASE}.flow`,
    kind: "announcement",
    title: "New — flow balance and backlog forecast",
    body: "Execution Analytics now shows what arrived against what left, a backlog trajectory with a run-rate projection, and an executive read composed from those figures. Switch the whole region between case counts and revenue exposure.",
    learnMoreHref: "/analytics",
  },
];

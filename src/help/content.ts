/**
 * Help Center content and the per-screen documentation panels.
 *
 * Structured TypeScript rather than MDX: MDX needs a dependency and build
 * config, and structured content stays greppable — which is what makes the
 * documentation search below a scored match over a flat array rather than a
 * second index to maintain.
 *
 * Much of this is adapted from `.claude/PROJECT_CONTEXT.md` and
 * `.claude/DEMO_SCRIPT.md` rather than written twice.
 */

export interface HelpBlock {
  kind: "paragraph" | "list" | "steps";
  /** Present on list and steps blocks. */
  items?: string[];
  text?: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  icon: string;
  category: "Overview" | "Using QuikOps" | "Reference" | "Support";
  /** Searchable keywords beyond the title and body. */
  keywords: string[];
  blocks: HelpBlock[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "overview",
    title: "Overview",
    summary: "What QuikOps AI is and the gap it closes.",
    icon: "BookMarked",
    category: "Overview",
    keywords: ["what is", "introduction", "purpose", "enterprise data platform"],
    blocks: [
      {
        kind: "paragraph",
        text: "Your enterprise data identifies operational bottlenecks. QuikOps AI turns them into executed, verified outcomes. A detected signal becomes a case, which is scored, owned, worked, evidenced and independently verified — and only then does its revenue exposure count as recovered.",
      },
      {
        kind: "paragraph",
        text: "The gap it closes: analytics tells you a problem exists, but nothing owns it, tracks it to closure, or proves the fix held.",
      },
    ],
  },
  {
    id: "how-it-works",
    title: "How QuikOps AI works",
    summary: "Detection through to verified closure.",
    icon: "Activity",
    category: "Overview",
    keywords: ["lifecycle", "workflow", "process", "verification"],
    blocks: [
      {
        kind: "steps",
        items: [
          "The enterprise data platform evaluates a rule against plant data and raises a signal.",
          "QuikOps opens a case and scores it 0–100 on a deterministic rule set.",
          "The case is routed to an owner, who builds and executes a corrective plan.",
          "Evidence is attached against each action as it completes.",
          "A reviewer — never the owner — verifies the outcome against a measurement window.",
          "Only on verification does the exposure count as recovered revenue.",
        ],
      },
    ],
  },
  {
    id: "modules",
    title: "Modules overview",
    summary: "What each screen is for.",
    icon: "LayoutDashboard",
    category: "Overview",
    keywords: ["screens", "navigation", "dashboard", "work manager"],
    blocks: [
      {
        kind: "list",
        items: [
          "Executive Dashboard — operational health across every plant, with each number traceable to the cases behind it.",
          "Work Manager — every detected case in one queue, with triage, assignment and bulk actions.",
          "Case Detail — the execution surface for a single case: plan, evidence, discussion, verification and audit.",
          "My Work — the owner's slice of the same queue.",
          "Action Center — the cross-case execution inbox: assigned work, SLA warnings, approvals and escalations.",
          "Execution Analytics — how the operation performs at closing what it detects.",
          "Reports — scheduled and on-demand reporting composed from the same figures.",
          "Connector Health — the enterprise data integration, made inspectable.",
          "Audit Log — append-only record of every change.",
          "Playbooks — reusable corrective templates, with their measured effect.",
          "Administration — users, routing, SLA thresholds and priority weights.",
        ],
      },
    ],
  },
  {
    id: "roles",
    title: "User roles",
    summary: "Who can do what.",
    icon: "Users",
    category: "Reference",
    keywords: ["permissions", "executive", "manager", "owner", "analyst", "admin"],
    blocks: [
      {
        kind: "list",
        items: [
          "Executive — reads the dashboard, sponsors work, never owns a case.",
          "Operations Manager — triages, assigns and verifies.",
          "Task Owner — owns cases and executes corrective actions.",
          "Analyst — investigates and can own cases.",
          "Administrator — configuration, users and routing rules.",
        ],
      },
      {
        kind: "paragraph",
        text: "Only operations managers, task owners and analysts can be assigned a case. The owner of a case can never be its reviewer — verification is a second pair of eyes by design.",
      },
    ],
  },
  {
    id: "copilot",
    title: "AI Copilot guide",
    summary: "What it can answer, and what it will refuse.",
    icon: "Sparkles",
    category: "Using QuikOps",
    keywords: ["ai", "claude", "assistant", "ask", "copilot"],
    blocks: [
      {
        kind: "paragraph",
        text: "The Copilot opens at two scopes. On a case it answers from that case's complete record; on the dashboard it answers about the whole operational position.",
      },
      {
        kind: "paragraph",
        text: "It answers only from the record supplied. If something is not there, it says which fact is missing rather than filling the gap. It will not restate the priority score as its own judgement — the score comes from a deterministic rule set, and the Copilot explains the arithmetic.",
      },
      {
        kind: "paragraph",
        text: "Your case data is sent to Anthropic only when you ask a question, and only for the case on screen. The API key is read server-side and never reaches the browser.",
      },
    ],
  },
  {
    id: "workflow",
    title: "Workflow guide",
    summary: "Running a case from detection to closure.",
    icon: "ListChecks",
    category: "Using QuikOps",
    keywords: ["assign", "verify", "close", "evidence", "actions"],
    blocks: [
      {
        kind: "steps",
        items: [
          "Open the case from the queue, the dashboard or a search result.",
          "Assign an owner. The status moves to assigned on its own — you never type a status.",
          "Start work, then add corrective actions or apply a playbook.",
          "Report progress on each action; its status follows the percentage.",
          "Attach evidence against the actions it supports.",
          "Request verification. The case routes to a reviewer who is not you.",
          "The reviewer approves, rejects or sends back, with a written justification.",
        ],
      },
    ],
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    summary: "Navigating without the mouse.",
    icon: "Command",
    category: "Reference",
    keywords: ["keyboard", "accessibility", "hotkeys", "navigation"],
    blocks: [
      {
        kind: "list",
        items: [
          "Tab / Shift+Tab — move between controls. Focus is always visible.",
          "Enter or Space — activate the focused control, including a table row.",
          "Escape — close the Copilot, a drawer or a dialog.",
          "Arrow keys — move within a menu once it is open.",
          "Skip to main content — the first Tab stop on every page.",
        ],
      },
    ],
  },
  {
    id: "data-sources",
    title: "Data sources",
    summary: "Where each number comes from.",
    icon: "PlugZap",
    category: "Reference",
    keywords: ["enterprise data platform", "sap", "erp", "connector", "ingestion"],
    blocks: [
      {
        kind: "paragraph",
        text: "Operational cases arrive from the enterprise data platform's exception signals or a playbook's own recurrence monitor; some are opened by hand. Reference data — materials, plants, suppliers, orders — comes from SAP.",
      },
      {
        kind: "paragraph",
        text: "OTIF, inventory coverage and schedule adherence are measured by the enterprise data platform over its own window. QuikOps reads them; it never recomputes them. Everything else — open counts, exposure, breaches, mean time to resolve, SLA adherence — is derived from the case corpus, which is why the dashboard, Analytics and the Copilot always agree.",
      },
      {
        kind: "paragraph",
        text: "Connector Health shows every feed's status, run history and dead-letter queue.",
      },
    ],
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    summary: "The questions that come up most.",
    icon: "CircleHelp",
    category: "Support",
    keywords: ["faq", "questions", "help", "why"],
    blocks: [
      {
        kind: "list",
        items: [
          "Is the priority score set by AI? No. It is a deterministic weighted rule set, configurable per deployment. AI may suggest an adjustment; it never sets the number.",
          "Why did closing a case not recover any revenue? Verification is the only route to recovered revenue. Closing a case administratively removes it from the queue and recovers nothing.",
          "Why is a case's health low when its priority is high? Priority says how much a case matters; health says whether the work is moving. They are different questions.",
          "Why can I not verify my own case? Segregation of duties. The reviewer is never the owner.",
          "Where did my changes go after refreshing? This build keeps changes for the session only. Refresh re-reads the stored record.",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    summary: "When something does not look right.",
    icon: "TriangleAlert",
    category: "Support",
    keywords: ["problem", "error", "broken", "support"],
    blocks: [
      {
        kind: "list",
        items: [
          "The Copilot shows a 'Demo AI' badge — no API key is configured. Answers still come from the real case record; set ANTHROPIC_API_KEY for live Claude.",
          "A connector reads 'Stale' — it has missed its cadence badly enough to matter. Check its run history and dead-letter queue.",
          "A dead-letter message cannot be replayed — duplicates and schema mismatches need an upstream fix, not a retry.",
          "A number looks wrong — every portfolio figure is derived from the case corpus. If two screens disagree, that is a defect worth reporting.",
        ],
      },
    ],
  },
  {
    id: "release-notes",
    title: "Release notes",
    summary: "What changed, most recent first.",
    icon: "FileText",
    category: "Support",
    keywords: ["changelog", "version", "updates", "new"],
    blocks: [
      {
        kind: "list",
        items: [
          "0.9.0 — Reports, Audit Log, Administration and Playbooks added. Shared table, KPI and toolbar components extracted.",
          "0.8.0 — Connector Health added; enterprise data ingestion made inspectable.",
          "0.7.0 — All portfolio figures reconciled to one derivation, so every screen agrees.",
          "0.6.0 — Action Center added: the cross-case execution inbox.",
          "0.5.0 — Execution Analytics added.",
          "0.4.0 — Live Anthropic Copilot at case and portfolio scope.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------ Per-screen documentation */

export interface ScreenDoc {
  moduleKey: string;
  title: string;
  purpose: string;
  businessValue: string;
  kpisExplained: { label: string; detail: string }[];
  workflow: string[];
  bestPractices: string[];
  relatedScreens: { label: string; href: string }[];
}

export const SCREEN_DOCS: Record<string, ScreenDoc> = {
  dashboard: {
    moduleKey: "dashboard",
    title: "Executive Dashboard",
    purpose:
      "Operational health across every plant, with each number traceable to the cases behind it.",
    businessValue:
      "Turns a monthly reporting cycle into a live position. Every figure is a link, so the gap between noticing a number and acting on it is one click.",
    kpisExplained: [
      { label: "On-time in full", detail: "Measured by the enterprise data platform against the 95% target. Read, never recomputed." },
      { label: "Revenue at risk", detail: "Confirmed demand that cannot be served if open conditions are not cleared. Exposure, not loss taken." },
      { label: "Open critical cases", detail: "Cases scoring 75 or above on the deterministic priority rule set." },
      { label: "SLA breaches", detail: "Open cases past their band's resolution target." },
    ],
    workflow: [
      "Read the KPI band for the position.",
      "Read the AI summary for what is driving it.",
      "Click any number to open the cases behind it.",
    ],
    bestPractices: [
      "Start from the breach count, not the revenue figure — late work is what compounds.",
      "Use the Copilot to ask which plant is worst before drilling in.",
    ],
    relatedScreens: [
      { label: "Work Manager", href: "/work" },
      { label: "Execution Analytics", href: "/analytics" },
    ],
  },
  "my-work": {
    moduleKey: "my-work",
    title: "My Work",
    purpose:
      "The cases you personally own, ordered so the next thing to do is at the top.",
    businessValue:
      "Work Manager is the queue for the operation; this is the queue for one person. An owner who has to filter a portfolio to find their own cases will eventually stop looking.",
    kpisExplained: [
      { label: "Assigned to me", detail: "Open cases where you are the recorded owner. Ownership is assigned in Work Manager or on the case itself." },
      { label: "Overdue", detail: "Your cases past the resolution target for their priority band." },
      { label: "Awaiting my verification", detail: "Cases where you are the reviewer. You cannot verify work you submitted yourself." },
    ],
    workflow: [
      "Read the overdue count first — those are already late.",
      "Open a case to record corrective action and evidence.",
      "Request verification once the work is done; a reviewer decides, not you.",
    ],
    bestPractices: [
      "Ownership is not the same as verification. A case you own is a case someone else has to sign off.",
      "If a case is not moving, escalate it rather than letting the SLA clock run.",
    ],
    relatedScreens: [
      { label: "Work Manager", href: "/work" },
      { label: "Action Center", href: "/actions" },
    ],
  },
  work: {
    moduleKey: "work",
    title: "Work Manager",
    purpose: "Every detected case in one queue, with triage, assignment and bulk actions.",
    businessValue:
      "One place where nothing is lost. Filters, search and the board view all read the same array, so the counts can never disagree with the rows.",
    kpisExplained: [
      { label: "Open cases", detail: "Everything not yet verified or closed." },
      { label: "Overdue", detail: "Past the resolution target for its priority band." },
      { label: "Pending verification", detail: "Submitted and waiting on a reviewer." },
    ],
    workflow: [
      "Filter or search to the working set.",
      "Assign owners, individually or in bulk.",
      "Open a case to execute it.",
    ],
    bestPractices: [
      "Unassigned criticals first — an unowned case is not being worked, whatever its score.",
      "The URL carries the filter state, so a view can be shared as a link.",
    ],
    relatedScreens: [
      { label: "Action Center", href: "/actions" },
      { label: "My Work", href: "/my-work" },
    ],
  },
  actions: {
    moduleKey: "actions",
    title: "Action Center",
    purpose:
      "The execution inbox: assigned work, SLA warnings, approvals, escalations and AI recommendations.",
    businessValue:
      "Cases are the unit of accountability; actions are the unit of work. This is where a manager sees what is actually blocking closure.",
    kpisExplained: [
      { label: "Actions assigned to me", detail: "Open actions you personally hold." },
      { label: "Overdue actions", detail: "Past their own due date, which sits inside the case's SLA window." },
      { label: "SLA breaches", detail: "Open actions on cases already past target." },
      { label: "Pending approvals", detail: "Actions on cases sitting with a reviewer." },
    ],
    workflow: [
      "Use a KPI tile to switch to that queue.",
      "Select rows for bulk complete or reassignment.",
      "Open a row for the full case context and audit trail.",
    ],
    bestPractices: [
      "Apply an AI recommendation only after reading its confidence drivers.",
      "An action at 100% is complete — approval is a case-level decision.",
    ],
    relatedScreens: [
      { label: "Work Manager", href: "/work" },
      { label: "Playbooks", href: "/playbooks" },
    ],
  },
  analytics: {
    moduleKey: "analytics",
    title: "Execution Analytics",
    purpose: "How the operation performs at closing the exceptions it detects.",
    businessValue:
      "Separates operational performance from execution performance. You can be getting better at fixing things and still be losing ground — this shows both.",
    kpisExplained: [
      { label: "Mean time to resolve", detail: "Mean opened-to-verified hours across resolved cases." },
      { label: "SLA adherence", detail: "Share of cases that never breached their target." },
      { label: "Verification pass rate", detail: "Approved as a share of everything submitted to a reviewer." },
      { label: "Recurrence rate", detail: "Share of cases that are a second or later detection." },
    ],
    workflow: [
      "Set the date range and any plant or priority filter.",
      "Read the trends, then the performance tables.",
      "Export the aggregates for a review pack.",
    ],
    bestPractices: [
      "Every figure carries its sample size. Check it before quoting a percentage.",
      "Comparisons are against the unfiltered set, so a filter answers 'how does this slice differ'.",
    ],
    relatedScreens: [
      { label: "Reports", href: "/reports" },
      { label: "Executive Dashboard", href: "/dashboard" },
    ],
  },
  connectors: {
    moduleKey: "connectors",
    title: "Connector Health",
    purpose: "The enterprise data integration and its siblings, made inspectable.",
    businessValue:
      "The product's whole claim rests on detection being real and monitored. This is the screen that proves it.",
    kpisExplained: [
      { label: "Integration health", detail: "Mean health across enabled feeds. Paused connectors are excluded." },
      { label: "Records processed", detail: "Rows applied over the scored window." },
      { label: "Dead-letter queue", detail: "Received but never delivered downstream." },
      { label: "Cases raised", detail: "Signals that became owned work." },
    ],
    workflow: [
      "Scan the cards for anything not healthy.",
      "Open the run history for a failing feed.",
      "Replay dead-letter messages that can be replayed.",
    ],
    bestPractices: [
      "A stale feed is a different problem from a failing one — it has stopped, not degraded.",
      "Duplicates and schema mismatches need an upstream fix; replaying them changes nothing.",
    ],
    relatedScreens: [
      { label: "Audit Log", href: "/system/audit" },
      { label: "Administration", href: "/admin" },
    ],
  },
  playbooks: {
    moduleKey: "playbooks",
    title: "Playbooks",
    purpose: "Reusable corrective templates per exception type, with their measured effect.",
    businessValue:
      "Turns tribal knowledge into a library, and then tells you which plays actually hold rather than which feel thorough.",
    kpisExplained: [
      { label: "SLA adherence", detail: "Share of this playbook's cases that never breached." },
      { label: "Recurrence after application", detail: "How often the condition came back anyway." },
      { label: "Effectiveness", detail: "Adherence less half the recurrence rate." },
    ],
    workflow: [
      "Find the playbook for the exception type.",
      "Review the steps and their default owners.",
      "Apply it from a case to generate the plan.",
    ],
    bestPractices: [
      "Check the sample size before trusting a percentage — several playbooks have run on a handful of cases.",
      "A play that closes cases quickly and lets them recur has not worked.",
    ],
    relatedScreens: [
      { label: "Action Center", href: "/actions" },
      { label: "Execution Analytics", href: "/analytics" },
    ],
  },
  audit: {
    moduleKey: "audit",
    title: "Audit Log",
    purpose: "Append-only record of every change, with actor, timestamp and source.",
    businessValue:
      "The compliance answer to 'who changed this, and when' — and the reason a verification decision can be defended months later.",
    kpisExplained: [
      { label: "Audit entries", detail: "Every recorded change across every case." },
      { label: "Machine-recorded", detail: "Entries written by ingestion or the rule engine rather than a person." },
    ],
    workflow: [
      "Filter by actor, action, source or plant.",
      "Read the field-level diff on any entry.",
      "Export the filtered set for an auditor.",
    ],
    bestPractices: [
      "Session changes interleave with the stored record rather than sitting apart — the timeline is one thing.",
    ],
    relatedScreens: [
      { label: "Connector Health", href: "/system/connectors" },
      { label: "Reports", href: "/reports" },
    ],
  },
  admin: {
    moduleKey: "admin",
    title: "Administration",
    purpose: "Users, roles, plant scoping, routing, SLA thresholds and priority weights.",
    businessValue:
      "Makes the scoring rules configuration rather than code — and shows the consequence of a change before it is saved.",
    kpisExplained: [
      { label: "Assignable owners", detail: "Roles that can hold a case. Executives sponsor work; they do not own it." },
      { label: "Routing rules", detail: "Derived from how cases are actually owned today." },
    ],
    workflow: [
      "Adjust a priority weight or SLA target.",
      "Read the preview — which cases change band, which newly breach.",
      "Apply only once the consequence is acceptable.",
    ],
    bestPractices: [
      "Change one weight at a time. The preview shows the effect of everything together.",
    ],
    relatedScreens: [
      { label: "Audit Log", href: "/system/audit" },
      { label: "Playbooks", href: "/playbooks" },
    ],
  },
  reports: {
    moduleKey: "reports",
    title: "Reports",
    purpose: "Scheduled and on-demand reporting, composed from the same figures as the dashboard.",
    businessValue:
      "The artefact a manager sends upward when they are not in the room — and it cannot disagree with the screen it came from.",
    kpisExplained: [
      { label: "Active schedules", detail: "Reports that generate and distribute without being asked." },
      { label: "Generated", detail: "Runs in the last 30 days, with failures called out." },
    ],
    workflow: [
      "Pick a template, then toggle the sections it contains.",
      "Read the preview — it is what will print.",
      "Export to CSV, or generate the PDF.",
    ],
    bestPractices: [
      "The preview is the document. If it looks right on screen, it prints right.",
    ],
    relatedScreens: [
      { label: "Execution Analytics", href: "/analytics" },
      { label: "Audit Log", href: "/system/audit" },
    ],
  },
};

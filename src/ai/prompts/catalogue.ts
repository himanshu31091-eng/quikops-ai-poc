/**
 * The questions the Copilot is built to answer.
 *
 * Canonical and shared: the panel renders these, and nothing re-types the
 * wording somewhere else. Adding one here adds it to the UI.
 */
export interface CopilotPromptSpec {
  id: string;
  /** Button label — short enough for a narrow panel. */
  label: string;
  /** What is actually sent as the question. */
  prompt: string;
  icon: string;
  /** Shown as a quick chip above the composer once a conversation has started. */
  quick: boolean;
}

export const COPILOT_PROMPTS: CopilotPromptSpec[] = [
  {
    id: "why",
    label: "Explain why this happened",
    prompt: "Explain why this issue occurred.",
    icon: "CircleHelp",
    quick: true,
  },
  {
    id: "summarise",
    label: "Summarise this case",
    prompt: "Summarise this case.",
    icon: "FileText",
    quick: true,
  },
  {
    id: "executive",
    label: "Generate an executive summary",
    prompt: "Generate an executive summary of this case.",
    icon: "Sparkles",
    quick: true,
  },
  {
    id: "actions",
    label: "Recommend corrective actions",
    prompt: "Recommend corrective actions.",
    icon: "ListChecks",
    quick: true,
  },
  {
    id: "preventive",
    label: "Suggest preventive actions",
    prompt: "Suggest preventive actions.",
    icon: "ShieldCheck",
    quick: false,
  },
  {
    id: "impact",
    label: "Estimate business impact",
    prompt: "Estimate the business impact.",
    icon: "DollarSign",
    quick: false,
  },
  {
    id: "priority",
    label: "Explain the priority score",
    prompt: "Explain the priority score.",
    icon: "Target",
    quick: false,
  },
  {
    id: "management-update",
    label: "Prepare a management update",
    prompt:
      "Prepare a management update on this case for the weekly operations review — position, what has been done, what is outstanding, and what you need from management.",
    icon: "Users",
    quick: false,
  },
  {
    id: "client-summary",
    label: "Generate a client-ready summary",
    prompt:
      "Generate a client-ready summary of this case suitable for sending to the affected customer — factual, no internal blame, clear on what is being done and by when.",
    icon: "Send",
    quick: false,
  },
];

/**
 * The portfolio equivalent, shown when the Copilot is opened from the Executive
 * Dashboard. Same shape, different questions: these are the ones an executive
 * asks about the operation rather than about a single case.
 */
export const PORTFOLIO_PROMPTS: CopilotPromptSpec[] = [
  {
    id: "worst-plant",
    label: "Why does Vapi need attention?",
    prompt:
      "Which plant needs attention first, and what is actually driving it? Be specific about the cases behind your answer and name the source records where you have them.",
    icon: "Factory",
    quick: true,
  },
  {
    id: "today-focus",
    label: "What should I focus on today?",
    prompt:
      "If I only have time for three things today, what should they be and why? Name the specific cases.",
    icon: "Target",
    quick: true,
  },
  {
    id: "biggest-risk",
    label: "What is driving revenue at risk?",
    prompt:
      "Where is our biggest revenue exposure concentrated, and what is the single action that would reduce it most?",
    icon: "DollarSign",
    quick: true,
  },
  {
    id: "otif-decline",
    label: "Why is OTIF declining?",
    prompt:
      "Why is on-time-in-full declining? Work from the per-plant OTIF movement and the open cases behind it, and say which plants are carrying the decline.",
    icon: "TrendingDown",
    quick: true,
  },
  {
    id: "recurrence",
    label: "Which exceptions are recurring?",
    prompt:
      "Which conditions have been detected more than once, and what does that say about whether the previous corrective action held? Name the cases and their detection counts.",
    icon: "History",
    quick: false,
  },
  {
    id: "supplier-pattern",
    label: "Which suppliers are behind this?",
    prompt:
      "Are there patterns across suppliers I should be treating commercially rather than case by case? Name the suppliers and the cases.",
    icon: "TruckElectric",
    quick: true,
  },
  {
    id: "overdue-actions",
    label: "What actions are overdue?",
    prompt:
      "Which corrective actions are past their due date, who owns them, and which cases do they belong to? Say where the execution is stalling rather than just listing them.",
    icon: "ListChecks",
    quick: true,
  },
  {
    id: "this-week",
    label: "What changed this week?",
    prompt:
      "What moved in the last seven days — opened, verified, closed, and anything that passed its resolution target? Tell me whether the week was net positive.",
    icon: "History",
    quick: false,
  },
  {
    id: "kpi-moved",
    label: "Did OTIF move after the corrective action?",
    prompt:
      "Has on-time-in-full moved against the baseline captured when the polymer-resin case opened? Say what the reading is and whether the measurement window has closed — do not tell me the action caused it.",
    icon: "Target",
    quick: false,
  },
  {
    id: "related-kpis",
    label: "What related KPIs should I review?",
    prompt:
      "If delivery performance is improving, what else should management be watching for pressure — inventory coverage, changeovers, quality holds? Name the indicators and the open cases sitting behind them.",
    icon: "Gauge",
    quick: false,
  },
  {
    id: "board-brief",
    label: "Brief me for the board",
    prompt:
      "Write me a board-level briefing on operational performance: the position, what is driving it, what is being done, and what needs a decision.",
    icon: "Sparkles",
    quick: false,
  },
  {
    id: "sla-risk",
    label: "What is about to breach SLA?",
    prompt:
      "What is past SLA or about to breach, and who owns it? Tell me where the accountability gaps are.",
    icon: "Clock",
    quick: false,
  },
  {
    id: "unowned",
    label: "What has nobody picked up?",
    prompt:
      "Which open cases have no owner, and which of them matter most? Recommend who should take them.",
    icon: "UserCog",
    quick: false,
  },
  {
    id: "execution-read",
    label: "Are we getting better or worse?",
    prompt:
      "Read our execution performance against the operational numbers. Are we improving at fixing things even if the operational KPIs are deteriorating?",
    icon: "ChartNoAxesColumn",
    quick: false,
  },
];

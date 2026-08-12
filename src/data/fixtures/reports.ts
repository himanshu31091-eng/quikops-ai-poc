import type { UserRole } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";

/**
 * Report templates, schedules and run history.
 *
 * A template declares *which sections* a report contains; the sections
 * themselves are composed at render time from the same portfolio derivations
 * the dashboard uses (`src/domain/portfolio-metrics.ts`), so a report never
 * disagrees with the screen it was generated from.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const ago = (ms: number): string => new Date(DEMO_NOW.getTime() - ms).toISOString();
const ahead = (ms: number): string => new Date(DEMO_NOW.getTime() + ms).toISOString();

/** The composable blocks a report can contain. */
export const REPORT_SECTIONS = [
  "headline",
  "plant-performance",
  "sla-compliance",
  "supplier-exposure",
  "case-list",
  "execution-metrics",
  "audit-extract",
] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const REPORT_SECTION_META: Record<
  ReportSection,
  { label: string; description: string; icon: string }
> = {
  headline: {
    label: "Headline position",
    description: "Open cases, exposure, breaches and unowned work.",
    icon: "LayoutDashboard",
  },
  "plant-performance": {
    label: "Plant performance",
    description: "OTIF, open cases, exposure and SLA adherence per site.",
    icon: "Factory",
  },
  "sla-compliance": {
    label: "SLA compliance",
    description: "Adherence, breaches and mean time to resolve.",
    icon: "ShieldCheck",
  },
  "supplier-exposure": {
    label: "Supplier exposure",
    description: "Suppliers carrying more than one open case.",
    icon: "TruckElectric",
  },
  "case-list": {
    label: "Case list",
    description: "Every open case in scope, highest priority first.",
    icon: "Rows3",
  },
  "execution-metrics": {
    label: "Execution metrics",
    description: "Verification pass rate, recurrence and weekly throughput.",
    icon: "ChartNoAxesColumn",
  },
  "audit-extract": {
    label: "Audit extract",
    description: "Recent state changes with actor and timestamp.",
    icon: "ScrollText",
  },
};

export type ReportCadence = "DAILY" | "WEEKLY" | "MONTHLY" | "ON_DEMAND";

export const CADENCE_META: Record<ReportCadence, { label: string; days: number | null }> = {
  DAILY: { label: "Daily", days: 1 },
  WEEKLY: { label: "Weekly", days: 7 },
  MONTHLY: { label: "Monthly", days: 30 },
  ON_DEMAND: { label: "On demand", days: null },
};

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  /** Who this report is written for. */
  audience: UserRole;
  sections: ReportSection[];
  icon: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "rpt_exec_summary",
    name: "Executive summary",
    description:
      "The position, what is driving it, and what needs a decision. Written for a board pack.",
    audience: "EXECUTIVE",
    sections: ["headline", "plant-performance", "supplier-exposure", "execution-metrics"],
    icon: "Sparkles",
  },
  {
    id: "rpt_sla_compliance",
    name: "SLA compliance",
    description:
      "Adherence against target by band and plant, with every breached case listed.",
    audience: "OPS_MANAGER",
    sections: ["sla-compliance", "plant-performance", "case-list"],
    icon: "ShieldCheck",
  },
  {
    id: "rpt_supplier_performance",
    name: "Supplier performance",
    description:
      "Exposure concentrated by supplier, with recurrence — the commercial escalation pack.",
    audience: "OPS_MANAGER",
    sections: ["supplier-exposure", "case-list"],
    icon: "TruckElectric",
  },
  {
    id: "rpt_plant_scorecard",
    name: "Plant scorecard",
    description: "One page per site: OTIF, open work, exposure and adherence.",
    audience: "OPS_MANAGER",
    sections: ["plant-performance", "sla-compliance", "case-list"],
    icon: "Factory",
  },
  {
    id: "rpt_audit_extract",
    name: "Audit extract",
    description:
      "Append-only change record for a period, for compliance and incident review.",
    audience: "ADMINISTRATOR",
    sections: ["audit-extract"],
    icon: "ScrollText",
  },
];

export interface ReportSchedule {
  id: string;
  templateId: string;
  cadence: ReportCadence;
  recipients: string[];
  isEnabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export const REPORT_SCHEDULES: ReportSchedule[] = [
  {
    id: "sch_exec_weekly",
    templateId: "rpt_exec_summary",
    cadence: "WEEKLY",
    recipients: ["elena.vasquez@permaconstructionaids.com", "marcus.reinhardt@permaconstructionaids.com"],
    isEnabled: true,
    lastRunAt: ago(2 * DAY_MS),
    nextRunAt: ahead(5 * DAY_MS),
  },
  {
    id: "sch_sla_daily",
    templateId: "rpt_sla_compliance",
    cadence: "DAILY",
    recipients: ["marcus.reinhardt@permaconstructionaids.com", "priya.sharma@permaconstructionaids.com"],
    isEnabled: true,
    lastRunAt: ago(14 * HOUR_MS),
    nextRunAt: ahead(10 * HOUR_MS),
  },
  {
    id: "sch_supplier_monthly",
    templateId: "rpt_supplier_performance",
    cadence: "MONTHLY",
    recipients: ["carlos.mendoza@permaconstructionaids.com"],
    isEnabled: true,
    lastRunAt: ago(11 * DAY_MS),
    nextRunAt: ahead(19 * DAY_MS),
  },
  {
    id: "sch_audit_monthly",
    templateId: "rpt_audit_extract",
    cadence: "MONTHLY",
    recipients: ["sandra.whitfield@permaconstructionaids.com"],
    isEnabled: false,
    lastRunAt: ago(38 * DAY_MS),
    nextRunAt: null,
  },
];

export type ReportRunStatus = "DELIVERED" | "FAILED" | "GENERATING";

export interface ReportRun {
  id: string;
  templateId: string;
  scheduleId: string | null;
  generatedAt: string;
  status: ReportRunStatus;
  /** Rows included in the generated document. */
  rowCount: number;
  recipients: number;
  generatedBy: string;
  format: "PDF" | "CSV";
}

export const REPORT_RUNS: ReportRun[] = [
  { id: "run_r001", templateId: "rpt_sla_compliance", scheduleId: "sch_sla_daily", generatedAt: ago(14 * HOUR_MS), status: "DELIVERED", rowCount: 19, recipients: 2, generatedBy: "Scheduler", format: "PDF" },
  { id: "run_r002", templateId: "rpt_exec_summary", scheduleId: "sch_exec_weekly", generatedAt: ago(2 * DAY_MS), status: "DELIVERED", rowCount: 29, recipients: 2, generatedBy: "Scheduler", format: "PDF" },
  { id: "run_r003", templateId: "rpt_sla_compliance", scheduleId: "sch_sla_daily", generatedAt: ago(38 * HOUR_MS), status: "DELIVERED", rowCount: 20, recipients: 2, generatedBy: "Scheduler", format: "PDF" },
  { id: "run_r004", templateId: "rpt_plant_scorecard", scheduleId: null, generatedAt: ago(3 * DAY_MS), status: "DELIVERED", rowCount: 19, recipients: 1, generatedBy: "Neha Deshpande", format: "CSV" },
  { id: "run_r005", templateId: "rpt_supplier_performance", scheduleId: "sch_supplier_monthly", generatedAt: ago(11 * DAY_MS), status: "DELIVERED", rowCount: 7, recipients: 1, generatedBy: "Scheduler", format: "PDF" },
  { id: "run_r006", templateId: "rpt_audit_extract", scheduleId: "sch_audit_monthly", generatedAt: ago(38 * DAY_MS), status: "FAILED", rowCount: 0, recipients: 0, generatedBy: "Scheduler", format: "CSV" },
  { id: "run_r007", templateId: "rpt_exec_summary", scheduleId: "sch_exec_weekly", generatedAt: ago(9 * DAY_MS), status: "DELIVERED", rowCount: 27, recipients: 2, generatedBy: "Scheduler", format: "PDF" },
];

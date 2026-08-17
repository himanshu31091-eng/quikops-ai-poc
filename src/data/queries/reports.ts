import { ROLE_META } from "@/src/config/app-config";
import { isOpenStatus } from "@/src/domain/case-status";
import {
  computePlantRollup,
  hasBreachedSla,
  portfolioCounts,
} from "@/src/domain/portfolio-metrics";
import type { CaseListItem, ExecutionMetrics, Plant } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { getCaseCorpus, getPeople, getPlants } from "./corpus";
import { EXECUTION_METRICS } from "../fixtures/metrics";
import {
  CADENCE_META,
  REPORT_RUNS,
  REPORT_SCHEDULES,
  REPORT_TEMPLATES,
  type ReportRun,
  type ReportSchedule,
  type ReportTemplate,
} from "../fixtures/reports";

/**
 * Reports data access.
 *
 * Report *content* is composed from `src/domain/portfolio-metrics.ts` — the same
 * module behind the dashboard, plant health, Analytics and the Copilot — so a
 * generated report cannot disagree with the screen it came from. Nothing here
 * recomputes a metric.
 */

export interface ScheduleView extends ReportSchedule {
  templateName: string;
  cadenceLabel: string;
}

export interface RunView extends ReportRun {
  templateName: string;
}

/** Everything a composed report can draw on. */
export interface ReportSource {
  counts: ReturnType<typeof portfolioCounts>;
  metrics: ExecutionMetrics;
  plants: (Plant & ReturnType<typeof computePlantRollup>)[];
  openCases: CaseListItem[];
  breachedCases: CaseListItem[];
  supplierExposure: {
    supplierName: string;
    openCases: number;
    revenueAtRisk: number;
    maxRecurrence: number;
  }[];
}

export interface ReportsData {
  templates: (ReportTemplate & { audienceLabel: string })[];
  schedules: ScheduleView[];
  runs: RunView[];
  source: ReportSource;
}

export async function getReportsData(): Promise<ReportsData> {
  const all = await getCaseCorpus();
  const plants = await getPlants();
  const people = await getPeople();
  const open = all.filter((item) => isOpenStatus(item.status));

  const bySupplier = new Map<string, { cases: number; revenue: number; recurrence: number }>();
  for (const item of open) {
    if (!item.supplierName) continue;
    const entry = bySupplier.get(item.supplierName) ?? { cases: 0, revenue: 0, recurrence: 0 };
    entry.cases += 1;
    entry.revenue += item.revenueAtRisk;
    entry.recurrence = Math.max(entry.recurrence, item.recurrenceCount);
    bySupplier.set(item.supplierName, entry);
  }

  const nameOf = (templateId: string): string =>
    REPORT_TEMPLATES.find((template) => template.id === templateId)?.name ?? templateId;

  return {
    templates: REPORT_TEMPLATES.map((template) => ({
      ...template,
      audienceLabel: ROLE_META[template.audience].label,
    })),
    schedules: REPORT_SCHEDULES.map((schedule) => ({
      ...schedule,
      templateName: nameOf(schedule.templateId),
      cadenceLabel: CADENCE_META[schedule.cadence].label,
    })),
    /* Run history is authored reference content — there is no report-run
     * table — but one row names a person, and on an evaluation tenant that has
     * to be one of their own rather than the demo organisation's. */
    runs: [...REPORT_RUNS]
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .map((run) => ({
        ...run,
        templateName: nameOf(run.templateId),
        generatedBy:
          run.generatedBy === "Scheduler"
            ? run.generatedBy
            : (people.find((person) => person.role === "OPS_MANAGER")?.name ?? run.generatedBy),
      })),
    source: {
      counts: portfolioCounts(all, DEMO_NOW),
      metrics: EXECUTION_METRICS,
      plants: plants.map((plant) => ({
        ...plant,
        ...computePlantRollup(all, plant.code, DEMO_NOW),
      })),
      openCases: [...open].sort((a, b) => b.priorityScore - a.priorityScore),
      breachedCases: open.filter((item) => hasBreachedSla(item, DEMO_NOW)),
      supplierExposure: [...bySupplier.entries()]
        .filter(([, entry]) => entry.cases > 1)
        .map(([supplierName, entry]) => ({
          supplierName,
          openCases: entry.cases,
          revenueAtRisk: entry.revenue,
          maxRecurrence: entry.recurrence,
        }))
        .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk),
    },
  };
}

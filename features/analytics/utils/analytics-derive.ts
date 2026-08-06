import { CHART_COLORS } from "@/components/charts/chart-primitives";
import { EXCEPTION_META, PRIORITY_META, ROLE_META } from "@/src/config/app-config";
import { isOpenStatus, statusGroupOf } from "@/src/domain/case-status";
import { SLA_TARGET_HOURS } from "@/src/domain/sla";
import type {
  CaseListItem,
  ExceptionType,
  Plant,
  PriorityBand,
  TrendPoint,
  User,
} from "@/src/domain/types";
import { EXCEPTION_TYPES, PRIORITY_BANDS } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatHours, formatPercent } from "@/src/lib/format";
import type {
  AnalyticsCase,
  AnalyticsKpi,
  CategoryDatum,
  HeatmapGrid,
  PersonPerformanceRow,
  PlantPerformanceRow,
  WeeklyDatum,
} from "../types";

/**
 * Every aggregate the module shows, derived from the case array.
 *
 * No business rule is restated here. SLA targets come from `src/domain/sla`,
 * the lifecycle collapse from `src/domain/case-status`, labels and colours from
 * `src/config/app-config`. This file only counts, groups and averages.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/* ------------------------------------------------------------ Case shaping */

/** ISO-ish week key, e.g. `2026-W32`. Weeks start Monday. */
function weekKey(date: Date): string {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / DAY_MS -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  const week = key.split("-W")[1] ?? key;
  return `W${week}`;
}

export function toAnalyticsCase(
  item: CaseListItem,
  reviewerById: Record<string, string>,
): AnalyticsCase {
  const opened = new Date(item.openedAt).getTime();
  const resolvedAt = item.verifiedAt ?? item.closedAt;
  const resolutionHours =
    resolvedAt !== null ? (new Date(resolvedAt).getTime() - opened) / HOUR_MS : null;
  const target = SLA_TARGET_HOURS[item.priorityBand];

  return {
    ...item,
    statusGroup: statusGroupOf(item.status),
    ageDays: Math.max(0, Math.floor((DEMO_NOW.getTime() - opened) / DAY_MS)),
    resolutionHours,
    slaUsagePct: resolutionHours === null ? null : (resolutionHours / target) * 100,
    isOpen: isOpenStatus(item.status),
    isBreached: item.slaBreachedAt !== null,
    metSla: resolutionHours !== null && resolutionHours <= target,
    resolvedWeek: resolvedAt !== null ? weekKey(new Date(resolvedAt)) : null,
    reviewerId: reviewerById[item.caseNo] ?? "",
  };
}

/* ---------------------------------------------------------------- Averages */

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** SLA adherence across resolved cases. Null when nothing has resolved. */
function adherencePct(cases: AnalyticsCase[]): number | null {
  const resolved = cases.filter((item) => item.resolutionHours !== null);
  if (resolved.length === 0) return null;
  return (resolved.filter((item) => item.metSla).length / resolved.length) * 100;
}

/* -------------------------------------------------------------- KPI cards */

export interface KpiFigures {
  mttrHours: number | null;
  slaAdherencePct: number | null;
  verificationPassRatePct: number | null;
  recurrenceRatePct: number | null;
  resolvedCount: number;
  submittedCount: number;
  verifiedCount: number;
  recurringCount: number;
  caseCount: number;
}

/** The four headline figures over an arbitrary set of cases. */
export function computeKpiFigures(cases: AnalyticsCase[]): KpiFigures {
  const resolved = cases.filter((item) => item.resolutionHours !== null);
  const verified = cases.filter((item) => item.verifiedAt !== null).length;
  const submitted = cases.filter(
    (item) => item.verifiedAt !== null || item.status === "PENDING_VERIFY",
  ).length;
  const recurring = cases.filter((item) => item.recurrenceCount > 1).length;

  return {
    mttrHours: mean(resolved.map((item) => item.resolutionHours!)),
    slaAdherencePct: adherencePct(cases),
    verificationPassRatePct: submitted === 0 ? null : (verified / submitted) * 100,
    recurrenceRatePct: cases.length === 0 ? null : (recurring / cases.length) * 100,
    resolvedCount: resolved.length,
    submittedCount: submitted,
    verifiedCount: verified,
    recurringCount: recurring,
    caseCount: cases.length,
  };
}

const delta = (current: number | null, baseline: number | null): number =>
  current === null || baseline === null
    ? 0
    : Math.round((current - baseline) * 10) / 10;

/**
 * The four headline cards.
 *
 * The comparison is against the **same derivation over the unfiltered set**,
 * not against the stored portfolio figures. That matters: `EXECUTION_METRICS`
 * reports the quarter across a population these cases are only part of, so
 * subtracting one from the other would produce a confident number that means
 * nothing. Comparing like with like answers the question a filter actually
 * raises — how does this slice differ from the whole — and reads as zero when
 * nothing is filtered, which is correct.
 */
export function buildKpis(
  current: KpiFigures,
  baseline: KpiFigures,
  resolutionSeries: TrendPoint[],
  otifSeries: TrendPoint[],
): AnalyticsKpi[] {
  const scope = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  return [
    {
      key: "mttr",
      label: "Mean time to resolve",
      display: current.mttrHours === null ? "—" : formatHours(current.mttrHours),
      deltaValue: delta(current.mttrHours, baseline.mttrHours),
      deltaUnit: "abs",
      higherIsBetter: false,
      footnote:
        current.resolvedCount === 0
          ? "No case in this selection has been resolved yet"
          : `Mean opened-to-verified across ${scope(current.resolvedCount, "resolved case")}`,
      icon: "Clock",
      series: resolutionSeries,
    },
    {
      key: "sla",
      label: "SLA adherence",
      display:
        current.slaAdherencePct === null ? "—" : formatPercent(current.slaAdherencePct),
      deltaValue: delta(current.slaAdherencePct, baseline.slaAdherencePct),
      deltaUnit: "pts",
      higherIsBetter: true,
      footnote:
        current.resolvedCount === 0
          ? "No resolved cases to measure against target"
          : `Resolved inside their own SLA target, of ${scope(current.resolvedCount, "resolved case")}`,
      icon: "ShieldCheck",
      series: otifSeries,
    },
    {
      key: "verification",
      label: "Verification pass rate",
      display:
        current.verificationPassRatePct === null
          ? "—"
          : formatPercent(current.verificationPassRatePct),
      deltaValue: delta(
        current.verificationPassRatePct,
        baseline.verificationPassRatePct,
      ),
      deltaUnit: "pts",
      higherIsBetter: true,
      footnote:
        current.submittedCount === 0
          ? "Nothing in this selection has reached verification"
          : `${current.verifiedCount} approved of ${scope(current.submittedCount, "case")} submitted`,
      icon: "CircleCheck",
      series: [],
    },
    {
      key: "recurrence",
      label: "Recurrence rate",
      display:
        current.recurrenceRatePct === null
          ? "—"
          : formatPercent(current.recurrenceRatePct),
      deltaValue: delta(current.recurrenceRatePct, baseline.recurrenceRatePct),
      deltaUnit: "pts",
      higherIsBetter: false,
      footnote:
        current.caseCount === 0
          ? "No cases in this selection"
          : `${scope(current.recurringCount, "case")} detected more than once, of ${current.caseCount}`,
      icon: "RefreshCw",
      series: [],
    },
  ];
}

/* ------------------------------------------------------------- Breakdowns */

export function byPriority(cases: AnalyticsCase[]): CategoryDatum[] {
  const colour: Record<PriorityBand, string> = {
    CRITICAL: "var(--color-critical)",
    HIGH: "var(--color-high)",
    MEDIUM: "var(--color-medium)",
    LOW: "var(--color-low)",
  };
  return PRIORITY_BANDS.map((band) => {
    const matching = cases.filter((item) => item.priorityBand === band);
    return {
      key: band,
      label: PRIORITY_META[band].label,
      count: matching.length,
      revenueAtRisk: matching.reduce((sum, item) => sum + item.revenueAtRisk, 0),
      color: colour[band],
    };
  }).filter((datum) => datum.count > 0);
}

export function byPlant(cases: AnalyticsCase[], plants: Plant[]): CategoryDatum[] {
  return plants
    .map((plant, index) => {
      const matching = cases.filter((item) => item.plantCode === plant.code);
      return {
        key: plant.code,
        label: plant.name,
        count: matching.length,
        revenueAtRisk: matching.reduce((sum, item) => sum + item.revenueAtRisk, 0),
        color: CHART_COLORS[index % CHART_COLORS.length]!,
      };
    })
    .filter((datum) => datum.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function byException(cases: AnalyticsCase[]): CategoryDatum[] {
  return EXCEPTION_TYPES.map((type, index) => {
    const matching = cases.filter((item) => item.exceptionType === type);
    return {
      key: type,
      label: EXCEPTION_META[type].label,
      count: matching.length,
      revenueAtRisk: matching.reduce((sum, item) => sum + item.revenueAtRisk, 0),
      color: CHART_COLORS[index % CHART_COLORS.length]!,
    };
  })
    .filter((datum) => datum.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------ Time series */

/**
 * Cases opened and resolved per week, over the requested window. Built from the
 * cases themselves rather than a stored series, so it always reconciles with
 * the tables beside it.
 */
export function weeklyThroughput(cases: AnalyticsCase[], days: number): WeeklyDatum[] {
  const cutoff = DEMO_NOW.getTime() - days * DAY_MS;
  const buckets = new Map<string, WeeklyDatum>();

  const ensure = (key: string): WeeklyDatum => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const created = { week: key, label: weekLabel(key), opened: 0, closed: 0 };
    buckets.set(key, created);
    return created;
  };

  // Seed every week in the window so a quiet week reads as zero rather than
  // vanishing and compressing the axis.
  for (let time = cutoff; time <= DEMO_NOW.getTime(); time += 7 * DAY_MS) {
    ensure(weekKey(new Date(time)));
  }

  for (const item of cases) {
    const opened = new Date(item.openedAt).getTime();
    if (opened >= cutoff) ensure(weekKey(new Date(item.openedAt))).opened += 1;
    if (item.resolvedWeek !== null) {
      const resolvedAt = new Date(item.verifiedAt ?? item.closedAt!).getTime();
      if (resolvedAt >= cutoff) ensure(item.resolvedWeek).closed += 1;
    }
  }

  return [...buckets.values()].sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Average resolution time per week. Sparse by nature — only weeks with a
 * resolved case produce a point — so weeks with no data are omitted rather than
 * drawn as zero, which would read as "instant resolution".
 */
export function resolutionTrend(cases: AnalyticsCase[], days: number): TrendPoint[] {
  const cutoff = DEMO_NOW.getTime() - days * DAY_MS;
  const buckets = new Map<string, number[]>();

  for (const item of cases) {
    if (item.resolutionHours === null || item.resolvedWeek === null) continue;
    const resolvedAt = new Date(item.verifiedAt ?? item.closedAt!).getTime();
    if (resolvedAt < cutoff) continue;
    const list = buckets.get(item.resolvedWeek) ?? [];
    list.push(item.resolutionHours);
    buckets.set(item.resolvedWeek, list);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, values]) => ({
      date: key,
      value: Math.round((mean(values) ?? 0) * 10) / 10,
    }));
}

/* ------------------------------------------------------ Performance tables */

export function plantPerformance(
  cases: AnalyticsCase[],
  plants: Plant[],
): PlantPerformanceRow[] {
  return plants
    .map((plant) => {
      const matching = cases.filter((item) => item.plantCode === plant.code);
      const sla = adherencePct(matching);
      const avg = mean(
        matching
          .filter((item) => item.resolutionHours !== null)
          .map((item) => item.resolutionHours!),
      );
      const open = matching.filter((item) => item.isOpen);
      const breached = open.filter((item) => item.isBreached).length;

      // Composite: adherence carries most of it, with a penalty for the share
      // of open work already past target. Ranking on adherence alone would put
      // a plant with one resolved case at the top.
      const breachShare = open.length === 0 ? 0 : breached / open.length;
      const score = Math.max(0, Math.round((sla ?? 0) - breachShare * 40));

      return {
        plantCode: plant.code,
        plantName: plant.name,
        country: plant.country,
        openCases: open.length,
        totalCases: matching.length,
        slaAdherencePct: sla ?? 0,
        avgResolutionHours: avg,
        revenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
        breached,
        score,
      };
    })
    .filter((row) => row.totalCases > 0);
}

function personPerformance(
  cases: AnalyticsCase[],
  people: User[],
  select: (item: AnalyticsCase) => string | null,
): PersonPerformanceRow[] {
  return people
    .map((person) => {
      const matching = cases.filter((item) => select(item) === person.id);
      const open = matching.filter((item) => item.isOpen);
      const resolved = matching.filter((item) => item.resolutionHours !== null);

      return {
        userId: person.id,
        name: person.name,
        jobTitle: person.jobTitle,
        roleLabel: ROLE_META[person.role].label,
        assigned: matching.length,
        resolved: resolved.length,
        open: open.length,
        breached: open.filter((item) => item.isBreached).length,
        slaAdherencePct: adherencePct(matching) ?? 0,
        avgResolutionHours: mean(resolved.map((item) => item.resolutionHours!)),
        revenueAtRisk: open.reduce((sum, item) => sum + item.revenueAtRisk, 0),
      };
    })
    .filter((row) => row.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned);
}

export function ownerPerformance(
  cases: AnalyticsCase[],
  people: User[],
): PersonPerformanceRow[] {
  return personPerformance(cases, people, (item) => item.ownerId);
}

export function reviewerPerformance(
  cases: AnalyticsCase[],
  people: User[],
): PersonPerformanceRow[] {
  // A reviewer only carries a case once it has reached them; counting every
  // case they would eventually review overstates their load.
  const reviewable = cases.filter(
    (item) => item.verifiedAt !== null || item.status === "PENDING_VERIFY",
  );
  return personPerformance(reviewable, people, (item) => item.reviewerId);
}

/* ---------------------------------------------------------------- Heatmaps */

/** SLA outcome by plant and priority band — where targets are actually missed. */
export function slaHeatmap(cases: AnalyticsCase[], plants: Plant[]): HeatmapGrid {
  const rows = plants
    .filter((plant) => cases.some((item) => item.plantCode === plant.code))
    .map((plant) => ({ key: plant.code, label: plant.name }));

  const columns = PRIORITY_BANDS.map((band) => ({
    key: band,
    label: PRIORITY_META[band].label,
  }));

  const cells = rows.flatMap((row) =>
    columns.map((column) => {
      const matching = cases.filter(
        (item) => item.plantCode === row.key && item.priorityBand === column.key,
      );
      const open = matching.filter((item) => item.isOpen);
      const breached = open.filter((item) => item.isBreached).length;
      const share = open.length === 0 ? 0 : breached / open.length;

      return {
        rowKey: row.key,
        columnKey: column.key,
        value: breached,
        intensity: share,
        detail:
          matching.length === 0
            ? "No cases"
            : `${breached} of ${open.length} open case${open.length === 1 ? "" : "s"} past SLA`,
      };
    }),
  );

  return {
    rows,
    columns,
    cells,
    scaleLabel: "Share of open cases past SLA",
    emptyLabel: "No cases in this combination",
  };
}

/** Age of open work by plant — where cases are quietly getting old. */
const AGE_BANDS = [
  { key: "0-2", label: "0–2d", min: 0, max: 2 },
  { key: "3-7", label: "3–7d", min: 3, max: 7 },
  { key: "8-14", label: "8–14d", min: 8, max: 14 },
  { key: "15+", label: "15d+", min: 15, max: Number.POSITIVE_INFINITY },
] as const;

export function agingHeatmap(cases: AnalyticsCase[], plants: Plant[]): HeatmapGrid {
  const open = cases.filter((item) => item.isOpen);
  const rows = plants
    .filter((plant) => open.some((item) => item.plantCode === plant.code))
    .map((plant) => ({ key: plant.code, label: plant.name }));

  const columns = AGE_BANDS.map((band) => ({ key: band.key, label: band.label }));

  const counts = rows.flatMap((row) =>
    AGE_BANDS.map((band) => ({
      rowKey: row.key,
      columnKey: band.key,
      matching: open.filter(
        (item) =>
          item.plantCode === row.key && item.ageDays >= band.min && item.ageDays <= band.max,
      ),
    })),
  );

  const peak = Math.max(1, ...counts.map((entry) => entry.matching.length));

  return {
    rows,
    columns,
    cells: counts.map((entry) => ({
      rowKey: entry.rowKey,
      columnKey: entry.columnKey,
      value: entry.matching.length,
      intensity: entry.matching.length / peak,
      detail:
        entry.matching.length === 0
          ? "Nothing open in this band"
          : `${entry.matching.length} open case${entry.matching.length === 1 ? "" : "s"}, ${
              entry.matching.filter((item) => item.isBreached).length
            } past SLA`,
    })),
    scaleLabel: "Open cases in band",
    emptyLabel: "No open cases at this plant",
  };
}

/** Trims a stored 90-day series to the requested window. */
export function sliceSeries(series: TrendPoint[], days: number): TrendPoint[] {
  return days >= series.length ? series : series.slice(-days);
}

export { adherencePct, mean };
export type { ExceptionType };

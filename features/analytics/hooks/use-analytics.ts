"use client";

import * as React from "react";
import type { FilterOption } from "@/components/patterns/filter-menu";
import type { AnalyticsData } from "@/src/data/queries/analytics";
import type { CaseListItem } from "@/src/domain/types";
import { useExecutionStore } from "@/src/workflow/execution-store";
import { projectCaseFacts } from "@/src/workflow/projections";
import {
  agingHeatmap,
  buildKpis,
  byException,
  byPlant,
  byPriority,
  computeKpiFigures,
  ownerPerformance,
  plantPerformance,
  resolutionTrend,
  reviewerPerformance,
  slaHeatmap,
  sliceSeries,
  toAnalyticsCase,
  weeklyThroughputSeries,
} from "../utils/analytics-derive";
import {
  buildFacets,
  DATE_RANGES,
  filterCases,
  isFiltered,
  rangeDays,
} from "../utils/analytics-filters";
import { exportAnalyticsCsv, exportAnalyticsPdf } from "../utils/export-analytics";
import {
  EMPTY_ANALYTICS_FILTERS,
  type AnalyticsFilterField,
  type AnalyticsFilters,
  type AnalyticsModel,
  type DateRangeKey,
} from "../types";

/**
 * The single owner of Execution Analytics state.
 *
 * Components below this hook are presentational. Everything derived — the KPI
 * cards, seven charts, four tables and two heatmaps — is memoised from the same
 * two inputs (server cases folded with session outcomes, plus the filters), so
 * no two panels on the page can disagree with each other.
 *
 * Session outcomes arrive through `projectCaseFacts`, the same projection the
 * dashboard uses. Verify a case on the case page and the analytics tables move
 * with it, without a refresh and without this module knowing how that happened.
 */

export interface AnalyticsApi {
  filters: AnalyticsFilters;
  model: AnalyticsModel;
  /**
   * Every case with session outcomes folded in, before the page filters run.
   * The flow region reads this rather than the filtered set: it carries its own
   * horizon, and applying the page date range on top would drop the cases that
   * make up the opening balance.
   */
  allCases: CaseListItem[];
  facets: { plants: FilterOption[]; priorities: FilterOption[]; categories: FilterOption[] };
  ranges: typeof DATE_RANGES;
  /** Human-readable description of the current selection, for exports. */
  scopeLabel: string;
  notice: string | null;

  toggleFilterValue: (field: AnalyticsFilterField, value: string) => void;
  clearFilterField: (field: AnalyticsFilterField) => void;
  setRange: (range: DateRangeKey) => void;
  clearFilters: () => void;
  exportCsv: () => void;
  exportPdf: () => void;
  dismissNotice: () => void;
}

const NOTICE_TIMEOUT_MS = 6_000;

export function useAnalytics(data: AnalyticsData): AnalyticsApi {
  const [filters, setFilters] = React.useState<AnalyticsFilters>(EMPTY_ANALYTICS_FILTERS);
  const [notice, setNotice] = React.useState<string | null>(null);
  const { state } = useExecutionStore();

  const reviewerById = React.useMemo(
    () =>
      Object.fromEntries(data.reviewers.map((link) => [link.caseNo, link.reviewerId])),
    [data.reviewers],
  );

  /** Server cases with this session's outcomes folded in. */
  const allCases = React.useMemo(
    () =>
      projectCaseFacts(data.cases, state).map((item) =>
        toAnalyticsCase(item, reviewerById),
      ),
    [data.cases, state, reviewerById],
  );

  const scoped = React.useMemo(
    () => filterCases(allCases, filters),
    [allCases, filters],
  );

  const facets = React.useMemo(
    () => buildFacets(allCases, filters, data.plants),
    [allCases, filters, data.plants],
  );

  const model = React.useMemo<AnalyticsModel>(() => {
    const days = rangeDays(filters.range);
    const resolution = resolutionTrend(scoped, days);
    const plants = plantPerformance(scoped, data.plants);
    const ranked = [...plants].sort((a, b) => b.score - a.score);

    return {
      cases: scoped,
      // Compared against the same derivation over every case, not against the
      // stored portfolio figures — see `buildKpis`.
      kpis: buildKpis(
        computeKpiFigures(scoped),
        computeKpiFigures(allCases),
        resolution,
        sliceSeries(data.otifSeries, days),
      ),
      otifSeries: sliceSeries(data.otifSeries, days),
      revenueSeries: sliceSeries(data.revenueAtRiskSeries, days),
      resolutionSeries: resolution,
      weekly: weeklyThroughputSeries(scoped, days),
      byPriority: byPriority(scoped),
      byPlant: byPlant(scoped, data.plants),
      byException: byException(scoped),
      topPlants: ranked.slice(0, 3),
      // Reversed so the worst reads first — the table is there to be acted on.
      bottomPlants: ranked.slice(-3).reverse(),
      owners: ownerPerformance(scoped, data.people),
      reviewers: reviewerPerformance(scoped, data.people),
      slaHeatmap: slaHeatmap(scoped, data.plants),
      agingHeatmap: agingHeatmap(scoped, data.plants),
      isFiltered: isFiltered(filters),
    };
  }, [scoped, allCases, filters, data.plants, data.people, data.otifSeries, data.revenueAtRiskSeries]);

  const scopeLabel = React.useMemo(() => {
    const parts: string[] = [
      DATE_RANGES.find((range) => range.key === filters.range)?.label ?? "90 days",
    ];
    if (filters.plants.length > 0) parts.push(`plants: ${filters.plants.join(", ")}`);
    if (filters.priorities.length > 0) {
      parts.push(`priority: ${filters.priorities.join(", ")}`);
    }
    if (filters.categories.length > 0) {
      parts.push(`category: ${filters.categories.length} selected`);
    }
    return parts.join(" · ");
  }, [filters]);

  React.useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const toggleFilterValue = React.useCallback(
    (field: AnalyticsFilterField, value: string) => {
      setFilters((previous) => {
        const current = previous[field] as string[];
        const next = current.includes(value)
          ? current.filter((entry) => entry !== value)
          : [...current, value];
        return { ...previous, [field]: next };
      });
    },
    [],
  );

  const clearFilterField = React.useCallback((field: AnalyticsFilterField) => {
    setFilters((previous) => ({ ...previous, [field]: [] }));
  }, []);

  const setRange = React.useCallback((range: DateRangeKey) => {
    setFilters((previous) => ({ ...previous, range }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters((previous) => ({ ...EMPTY_ANALYTICS_FILTERS, range: previous.range }));
  }, []);

  // Latest-value ref so the export callbacks stay stable across every
  // derivation, rather than being rebuilt whenever a filter moves.
  const exportRef = React.useRef<{ model: AnalyticsModel; scope: string }>({
    model,
    scope: scopeLabel,
  });
  exportRef.current = { model, scope: scopeLabel };

  const exportCsv = React.useCallback(() => {
    const filename = exportAnalyticsCsv(
      exportRef.current.model,
      exportRef.current.scope,
    );
    setNotice(`Exported ${filename}`);
  }, []);

  const exportPdf = React.useCallback(() => {
    exportAnalyticsPdf();
  }, []);

  const dismissNotice = React.useCallback(() => setNotice(null), []);

  return {
    filters,
    model,
    allCases,
    facets,
    ranges: DATE_RANGES,
    scopeLabel,
    notice,
    toggleFilterValue,
    clearFilterField,
    setRange,
    clearFilters,
    exportCsv,
    exportPdf,
    dismissNotice,
  };
}

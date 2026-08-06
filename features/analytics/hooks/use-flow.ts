"use client";

import * as React from "react";
import { EXCEPTION_META, PRIORITY_META } from "@/src/config/app-config";
import {
  bandFlow,
  buildExecutiveNarrative,
  buildFlowLedger,
  buildFlowRecommendations,
  compareFlowWindows,
  flowByDimension,
  forecastFlow,
  type BandFlow,
  type ExecutiveNarrative,
  type FlowComparison,
  type FlowDimension,
  type FlowForecast,
  type FlowLedger,
  type FlowRecommendation,
  type FlowSlice,
  type FlowUnit,
  type FlowHorizon,
} from "@/src/domain/flow-balance";
import type { CaseListItem, ExceptionType, Plant, PriorityBand } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatMoney } from "@/src/lib/format";

/**
 * The single owner of flow state.
 *
 * Deliberately separate from `useAnalytics`: the flow region asks a different
 * question of the same corpus — *is this getting better* rather than *how did we
 * perform* — and it carries two controls of its own, the horizon and the unit.
 * Folding them into the analytics filters would make every existing chart
 * re-derive whenever someone toggled to value, which is a cost paid for nothing.
 *
 * It takes cases already projected through the execution store, so a case
 * verified in this session moves the ledger, the burn-down and the forecast
 * together, and the flow figures cannot disagree with the tables above them.
 */

export interface FlowApi {
  horizon: FlowHorizon;
  unit: FlowUnit;
  dimension: FlowDimension;
  /** The slice the drill-down panel is showing, if any. */
  selectedKey: string | null;

  ledger: FlowLedger;
  forecast: FlowForecast;
  comparison: FlowComparison;
  slices: FlowSlice[];
  bands: BandFlow[];
  narrative: ExecutiveNarrative;
  recommendations: FlowRecommendation[];
  /** The slice adding most to the backlog. Null when nothing is growing. */
  worstSlice: FlowSlice | null;
  selectedSlice: FlowSlice | null;

  setHorizon: (horizon: FlowHorizon) => void;
  setUnit: (unit: FlowUnit) => void;
  setDimension: (dimension: FlowDimension) => void;
  selectSlice: (key: string | null) => void;
}

export function useFlow(cases: CaseListItem[], plants: Plant[]): FlowApi {
  const [horizon, setHorizonState] = React.useState<FlowHorizon>("month");
  const [unit, setUnit] = React.useState<FlowUnit>("count");
  const [dimension, setDimensionState] = React.useState<FlowDimension>("plant");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const currency = cases[0]?.currency ?? "USD";

  // The narrative and the recommendation cards quote money inside a sentence.
  // They take a formatter rather than a currency code so the notation matches
  // every other figure on the page — $1.0M, never USD1.0M.
  const formatValue = React.useCallback(
    (amount: number) => formatMoney(amount, currency, { forceCompact: true }),
    [currency],
  );

  const labelFor = React.useCallback(
    (key: string): string => {
      if (dimension === "plant") {
        const plant = plants.find((entry) => entry.code === key);
        return plant ? `${plant.code} · ${plant.name}` : key;
      }
      if (dimension === "band") return PRIORITY_META[key as PriorityBand]?.label ?? key;
      if (dimension === "exception") {
        return EXCEPTION_META[key as ExceptionType]?.label ?? key;
      }
      if (key === "unassigned") return "Unassigned";
      return cases.find((item) => item.ownerId === key)?.owner?.name ?? key;
    },
    [dimension, plants, cases],
  );

  const ledger = React.useMemo(
    () => buildFlowLedger(cases, DEMO_NOW, horizon),
    [cases, horizon],
  );

  const forecast = React.useMemo(() => forecastFlow(ledger, DEMO_NOW), [ledger]);

  const comparison = React.useMemo(
    () => compareFlowWindows(cases, DEMO_NOW, horizon),
    [cases, horizon],
  );

  const slices = React.useMemo(
    () => flowByDimension(cases, DEMO_NOW, horizon, dimension, labelFor),
    [cases, horizon, dimension, labelFor],
  );

  const bands = React.useMemo(() => bandFlow(cases, DEMO_NOW, horizon), [cases, horizon]);

  // Worst by net across plants specifically, not by whichever dimension the
  // reader happens to have selected — the narrative must not change meaning
  // because someone flipped a control.
  const worstSlice = React.useMemo(() => {
    const byPlant = flowByDimension(cases, DEMO_NOW, horizon, "plant", (key) => {
      const plant = plants.find((entry) => entry.code === key);
      return plant ? `${plant.code} · ${plant.name}` : key;
    });
    const first = byPlant[0];
    return first && first.net > 0 ? first : null;
  }, [cases, horizon, plants]);

  const narrative = React.useMemo(
    () => buildExecutiveNarrative(ledger, forecast, comparison, worstSlice, formatValue),
    [ledger, forecast, comparison, worstSlice, formatValue],
  );

  const recommendations = React.useMemo(
    () =>
      buildFlowRecommendations(cases, ledger, forecast, worstSlice, DEMO_NOW, formatValue),
    [cases, ledger, forecast, worstSlice, formatValue],
  );

  const selectedSlice = React.useMemo(
    () => slices.find((slice) => slice.key === selectedKey) ?? null,
    [slices, selectedKey],
  );

  // Changing the horizon or the dimension invalidates the open drill-down: the
  // panel would keep showing figures from a window the page no longer displays.
  const setHorizon = React.useCallback((next: FlowHorizon) => {
    setHorizonState(next);
    setSelectedKey(null);
  }, []);

  const setDimension = React.useCallback((next: FlowDimension) => {
    setDimensionState(next);
    setSelectedKey(null);
  }, []);

  const selectSlice = React.useCallback(
    (key: string | null) => setSelectedKey((current) => (current === key ? null : key)),
    [],
  );

  return {
    horizon,
    unit,
    dimension,
    selectedKey,
    ledger,
    forecast,
    comparison,
    slices,
    bands,
    narrative,
    recommendations,
    worstSlice,
    selectedSlice,
    setHorizon,
    setUnit,
    setDimension,
    selectSlice,
  };
}

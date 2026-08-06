/**
 * Application-wide constants. Nothing in this file is a magic number at the
 * point of use — components import from here.
 */

/** Frozen "now" for the demo so seeded data and relative dates stay coherent
 *  across every rehearsal. Replaced by `new Date()` when live ingestion runs. */
export const DEMO_NOW = new Date("2026-08-05T09:12:00Z");

export const OTIF_TARGET_PCT = 95;
export const KPI_MEASUREMENT_WINDOW_DAYS = 14;
export const SPARKLINE_POINTS = 14;
export const TREND_WINDOW_DAYS = 90;

export const DEFAULT_CURRENCY = "USD";

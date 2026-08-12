/**
 * Application-wide constants. Nothing in this file is a magic number at the
 * point of use — components import from here.
 */

/** Frozen "now" for the demo so seeded data and relative dates stay coherent
 *  across every rehearsal. Replaced by `new Date()` when live ingestion runs.
 *
 *  Set three days after the hero case is detected (12 Aug 2026, 08:15). That
 *  gap is deliberate: the first two corrective actions have closed, the third
 *  is a day past its due date, and the 14-day measurement window is open at
 *  day 3 — so the case shows an *interim* KPI reading rather than a finished
 *  verdict. A window that had already closed would let the demo imply the
 *  corrective action caused the improvement, which is the one claim this
 *  product does not make. */
export const DEMO_NOW = new Date("2026-08-15T09:12:00Z");

export const OTIF_TARGET_PCT = 95;
export const KPI_MEASUREMENT_WINDOW_DAYS = 14;
export const SPARKLINE_POINTS = 14;
export const TREND_WINDOW_DAYS = 90;

/** The operating currency of the seeded organisation. */
export const DEFAULT_CURRENCY = "INR";

/** Money is grouped the Indian way — lakh and crore, not thousands. */
export const CURRENCY_LOCALE = "en-IN";

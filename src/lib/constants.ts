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

/**
 * The operating currency of the deployment, for the handful of places that
 * render money without a record to take it from — a column total, a board
 * heading, a KPI tile.
 *
 * `NEXT_PUBLIC_` because money is formatted on both sides of the server/client
 * boundary and both must agree: a server rendering euros while the client
 * re-renders rupees is a hydration mismatch that shows up as the number
 * visibly changing after load. Inlined at build time, which is right for this
 * product — a deployment serves one organisation.
 *
 * Anything read from a record still wins. This is the fallback, not the rule.
 */
export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_QUIKOPS_CURRENCY || "INR";

/**
 * How that currency is grouped.
 *
 * Derived from the currency rather than configured separately, because the two
 * cannot disagree: rupees group as lakh and crore, euros in thousands, and a
 * deployment that set one without the other would render ₹5,75,300 as
 * €5,75,300 — which is what happened before this existed.
 */
export const CURRENCY_LOCALES_BY_CODE: Record<string, string> = {
  INR: "en-IN",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
  BRL: "pt-BR",
};

export const CURRENCY_LOCALE = CURRENCY_LOCALES_BY_CODE[DEFAULT_CURRENCY] ?? "en-US";

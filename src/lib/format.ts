import { formatDistanceStrict, differenceInCalendarDays, format } from "date-fns";

const FULL_CURRENCY_THRESHOLD = 1_000_000;
const RELATIVE_DATE_WINDOW_DAYS = 7;

/**
 * Money. Compact above 1M ($1.2M), full below ($180,000).
 * Never renders a fractional cent — executives read magnitude, not precision.
 */
export function formatMoney(
  amount: number,
  currency = "USD",
  options?: { forceCompact?: boolean; forceFull?: boolean },
): string {
  const compact =
    options?.forceCompact ??
    (options?.forceFull ? false : Math.abs(amount) >= FULL_CURRENCY_THRESHOLD);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
}

/** Bare number, thousands-separated. Used inside table cells. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Percentage points. `87.4` -> "87.4%" */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Signed delta for trend badges. `-7.6` -> "-7.6 pts" */
export function formatDelta(
  value: number,
  unit: "pts" | "%" | "abs" = "pts",
  fractionDigits = 1,
): string {
  const sign = value > 0 ? "+" : "";
  const magnitude = value.toFixed(fractionDigits);
  if (unit === "abs") return `${sign}${formatNumber(value, fractionDigits)}`;
  return `${sign}${magnitude}${unit === "pts" ? " pts" : "%"}`;
}

/**
 * Relative under 7 days ("2d ago"), absolute beyond ("2 Aug 2026").
 * Deterministic against a supplied `now` so server and client agree and
 * hydration never mismatches.
 */
export function formatWhen(value: Date | string, now: Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.abs(differenceInCalendarDays(now, date));
  if (days <= RELATIVE_DATE_WINDOW_DAYS) {
    return `${formatDistanceStrict(date, now, { roundingMethod: "floor" })} ago`
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" seconds", "s")
      .replace(" second", "s");
  }
  return format(date, "d MMM yyyy");
}

/** Due-date phrasing that reads naturally in a task list. */
export function formatDue(value: Date | string, now: Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = differenceInCalendarDays(date, now);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= RELATIVE_DATE_WINDOW_DAYS) return `Due in ${days}d`;
  return `Due ${format(date, "d MMM")}`;
}

export function formatTimestamp(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "d MMM yyyy, HH:mm");
}

export function formatClock(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "HH:mm");
}

/** Middle-ellipsis for identifiers, end-ellipsis for prose. */
export function truncateId(value: string, head = 10, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function formatHours(hours: number): string {
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)}d`;
}

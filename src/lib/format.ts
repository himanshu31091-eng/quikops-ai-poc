import { formatDistanceStrict, differenceInCalendarDays, format } from "date-fns";
import { de, enUS, es, fr, ja, ptBR } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import { CURRENCY_LOCALE, CURRENCY_LOCALES_BY_CODE, DEFAULT_CURRENCY } from "./constants";

const FULL_CURRENCY_THRESHOLD = 10_000_000;
const RELATIVE_DATE_WINDOW_DAYS = 7;

/**
 * What the date helpers need in order to speak the reader's language.
 *
 * Passed in rather than looked up, because this module imports no framework and
 * must stay callable from `src/domain`, a server component and a client
 * component alike. Both translators satisfy it structurally: `useTranslation()`
 * on the client and `getTranslations()` on the server.
 */
export interface FormatContext {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}

const DATE_LOCALES: Record<string, DateFnsLocale> = {
  en: enUS,
  es,
  "pt-BR": ptBR,
  de,
  fr,
  ja,
};

function dateLocale(locale: string): DateFnsLocale {
  return DATE_LOCALES[locale] ?? enUS;
}

/**
 * Money, in the reader's own convention.
 *
 * The locale is what makes this Indian rather than merely rupee-denominated:
 * `en-IN` groups by lakh and crore, so 18,000,000 reads ₹1.8Cr and 4,500,000
 * reads ₹45,00,000 — the way a plant manager in Vapi would write it. The
 * compact threshold sits at one crore for the same reason.
 *
 * Never renders a fractional unit — executives read magnitude, not precision.
 */
/** Grouping follows the currency being rendered — lakh for rupees, thousands
 *  for euros — so a mixed-currency screen never groups one like the other. */
function localeForCurrency(currency: string): string {
  return CURRENCY_LOCALES_BY_CODE[currency] ?? CURRENCY_LOCALE;
}

export function formatMoney(
  amount: number,
  currency = DEFAULT_CURRENCY,
  options?: { forceCompact?: boolean; forceFull?: boolean },
): string {
  const compact =
    options?.forceCompact ??
    (options?.forceFull ? false : Math.abs(amount) >= FULL_CURRENCY_THRESHOLD);

  return new Intl.NumberFormat(localeForCurrency(currency), {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
}

/**
 * Bare number, thousands-separated. Used inside table cells.
 *
 * Grouped by the tenant's own currency locale rather than `en-US`, so a euro
 * tenant does not read "512.900 €" in one column and "1,234" in the next.
 */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(localeForCurrency(DEFAULT_CURRENCY), {
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
 *
 * The unit abbreviations are collapsed from date-fns' English output before the
 * catalogue wraps them, because "2d" is read the same in every language this
 * product ships — it is the surrounding phrasing that changes, and that is what
 * `time.ago` carries.
 */
export function formatWhen(value: Date | string, now: Date, fmt: FormatContext): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.abs(differenceInCalendarDays(now, date));
  if (days <= RELATIVE_DATE_WINDOW_DAYS) {
    const distance = formatDistanceStrict(date, now, { roundingMethod: "floor" })
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" seconds", "s")
      .replace(" second", "s");
    return fmt.t("time.ago", { value: distance });
  }
  return format(date, "d MMM yyyy", { locale: dateLocale(fmt.locale) });
}

/** Due-date phrasing that reads naturally in a task list. */
export function formatDue(value: Date | string, now: Date, fmt: FormatContext): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = differenceInCalendarDays(date, now);
  if (days < 0) return fmt.t("due.overdue", { days: Math.abs(days) });
  if (days === 0) return fmt.t("due.today");
  if (days === 1) return fmt.t("due.tomorrow");
  if (days <= RELATIVE_DATE_WINDOW_DAYS) return fmt.t("due.inDays", { days });
  return fmt.t("due.onDate", {
    date: format(date, "d MMM", { locale: dateLocale(fmt.locale) }),
  });
}

export function formatTimestamp(value: Date | string, fmt?: FormatContext): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "d MMM yyyy, HH:mm", { locale: dateLocale(fmt?.locale ?? "en") });
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

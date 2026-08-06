/**
 * Internationalisation configuration.
 *
 * ⚠️ **Order-sensitive.** Roughly 900–1,400 user-visible strings exist today
 * (measured: ~257 component props, ~70 JSX text nodes, ~399 prose strings in
 * `src/config` and `src/data/fixtures`). Every new module adds 150–250 more, so
 * the retrofit cost roughly doubles for each one shipped before this lands.
 * The provider and key structure are here now for exactly that reason.
 *
 * **Scope decision, stated openly rather than left implicit:** the shell is
 * translated; the seeded operational corpus is not. Case titles, root causes and
 * playbook steps are *content*, and translating them needs a translator with
 * domain context rather than a string table. A production deployment would
 * carry them in the database with a locale column.
 */

export const LOCALES = ["en", "es", "de", "fr", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; intlTag: string; currency: string }
> = {
  en: { label: "English", nativeLabel: "English", intlTag: "en-US", currency: "USD" },
  es: { label: "Spanish", nativeLabel: "Español", intlTag: "es-MX", currency: "USD" },
  de: { label: "German", nativeLabel: "Deutsch", intlTag: "de-DE", currency: "EUR" },
  fr: { label: "French", nativeLabel: "Français", intlTag: "fr-FR", currency: "EUR" },
  ja: { label: "Japanese", nativeLabel: "日本語", intlTag: "ja-JP", currency: "JPY" },
};

/** Cookie the selected locale persists in, alongside `qo_persona`. */
export const LOCALE_COOKIE = "qo_locale";

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

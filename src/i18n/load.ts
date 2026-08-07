import en from "./messages/en.json";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Messages } from "./provider";

/**
 * Loads a catalogue on the server, for the first paint.
 *
 * Without this the provider starts on the English fallback and only fetches the
 * real catalogue when `setLocale` runs — so a reload with a Japanese cookie
 * rendered an English navigation until something changed the locale again. The
 * selector appeared to forget the choice it had persisted.
 *
 * Supplying the catalogue from the server means the first HTML is already in
 * the right language: no flash, no hydration mismatch, and no client fetch on
 * the common path.
 *
 * English is imported statically because it is both the default and the
 * fallback for a missing key; the rest are loaded on demand so four unused
 * catalogues never reach the browser.
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === DEFAULT_LOCALE) return en as Messages;

  try {
    const catalogue = (await import(`./messages/${locale}.json`)) as {
      default: Messages;
    };
    // Merged over English so a key missing from a translation renders the
    // English string rather than the raw key.
    return { ...(en as Messages), ...catalogue.default };
  } catch {
    return en as Messages;
  }
}

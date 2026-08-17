import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "./config";
import { loadMessages } from "./load";
import type { Messages } from "./provider";

/**
 * The translator for server components.
 *
 * `useTranslation` is a hook and a hook needs a client component, but most of
 * this product renders on the server — the dashboard, its cards, the page
 * headers, the tables. Without a server-side translator, localising those
 * screens would mean converting them to client components purely to reach a
 * string table, shipping the whole dashboard to the browser to change a label.
 *
 * Same catalogue, same fallback chain and same locale cookie as the client
 * provider, so a page rendered on the server and a component hydrated after it
 * cannot disagree about what a key says.
 */
export async function getTranslations(): Promise<{
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
  messages: Messages;
}> {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  // `loadMessages` merges the catalogue over English, so a key the translation
  // has not reached yet renders the English string rather than the raw key.
  const messages = await loadMessages(locale);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const template = messages[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };

  return { t, locale, messages };
}

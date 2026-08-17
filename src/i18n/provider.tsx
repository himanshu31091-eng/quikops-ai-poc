"use client";

import * as React from "react";
import en from "./messages/en.json";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "./config";
import type { LabelContext } from "@/src/domain/labels";
import type { FormatContext } from "@/src/lib/format";

/**
 * Locale context and the translation hook.
 *
 * `en` is imported statically so the default locale never round-trips, and it
 * doubles as the fallback: a missing key in another catalogue falls back to
 * English rather than rendering the raw key at a client.
 *
 * Number, currency and date formatting already funnel through
 * `src/lib/format.ts`, which is why locale-aware formatting is a small change
 * rather than a sweep — that file reads the tag from here.
 */

export type Messages = Record<string, string>;

interface I18nStore {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
  /** `t("common.resultsCount", { count: 19 })` */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** BCP-47 tag for `Intl`. */
  intlTag: string;
}

const FALLBACK: Messages = en as Messages;

const I18nContext = React.createContext<I18nStore | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  initialMessages,
  children,
}: {
  initialLocale?: Locale;
  /** Supplied by the server for the active locale; falls back to English. */
  initialMessages?: Messages;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const [messages, setMessages] = React.useState<Messages>(initialMessages ?? FALLBACK);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    // Persisted the same way the persona is, so a reload keeps the choice.
    document.cookie = `qo_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // Catalogues are small; loading on switch avoids shipping five of them.
    import(`./messages/${next}.json`)
      .then((module: { default: Messages }) => setMessages(module.default))
      .catch(() => setMessages(FALLBACK));
  }, []);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) =>
      interpolate(messages[key] ?? FALLBACK[key] ?? key, params),
    [messages],
  );

  const value = React.useMemo<I18nStore>(
    () => ({ locale, messages, setLocale, t, intlTag: LOCALE_META[locale].intlTag }),
    [locale, messages, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * The date helpers' context, memoised.
 *
 * `src/lib/format.ts` takes the translator as an argument rather than reaching
 * for a hook, so it stays framework-free and callable from the server. This is
 * the client half of that contract; `getTranslations()` is the server half and
 * satisfies the same shape.
 */
/**
 * The translator alone.
 *
 * `const { t } = useTranslation()` is the ordinary way to reach it, but a
 * destructured binding cannot be added to a component that already holds one —
 * this returns the function directly so wiring a component that renders one
 * stray label never collides with an existing declaration.
 */
export function useT(): I18nStore["t"] {
  return useTranslation().t;
}

export function useFormat(): FormatContext {
  const { t, locale } = useTranslation();
  return React.useMemo(() => ({ t, locale }), [t, locale]);
}

/**
 * The enum-label context for `src/domain/labels.ts`.
 *
 * Carries `messages` as well as `t` because those helpers distinguish a key the
 * catalogue actually holds from one it would merely echo back — that is what
 * lets an untranslated band fall back to its authored English label instead of
 * rendering `priority.SOMETHING_NEW` at a client.
 */
export function useLabels(): LabelContext {
  const { t, messages } = useTranslation();
  return React.useMemo(() => ({ t, messages }), [t, messages]);
}

/**
 * Returns a working translator even with no provider mounted, so a component
 * can render in isolation and existing screens keep working during migration.
 */
export function useTranslation(): I18nStore {
  const store = React.useContext(I18nContext);
  if (store) return store;
  return {
    locale: DEFAULT_LOCALE,
    messages: FALLBACK,
    setLocale: () => undefined,
    t: (key, params) => interpolate(FALLBACK[key] ?? key, params),
    intlTag: LOCALE_META[DEFAULT_LOCALE].intlTag,
  };
}

import type { Locale } from "@/src/i18n/config";

/**
 * Tenants the platform can be presented as.
 *
 * Configuration rather than literals, because "Sika" appearing inside a
 * component is how a demo environment becomes impossible to re-point at the
 * next prospect. Every screen reads the active tenant; none of them names one.
 *
 * Two tenants exist today and they are deliberately different in kind:
 * `perma-demo` is the representative operational scenario the POC was built
 * around, and `sika-evaluation` is an environment a client explores for
 * themselves. Their data must never mix — see `tenantId` on every business
 * record in the Prisma schema.
 */
export type TenantId = "sika-evaluation" | "perma-demo";

export type EnvironmentType = "evaluation" | "demo";

export interface TenantConfig {
  tenantId: TenantId;
  /** The organisation the environment is presented to or modelled on. */
  tenantName: string;
  /** Shown beside the product name in the shell. */
  environmentLabel: string;
  environmentType: EnvironmentType;
  industry: string;
  defaultLanguage: Locale;
  supportedLanguages: Locale[];
  /** ISO 4217. Never inferred from the interface language. */
  currency: string;
  /** Locale used for money and number grouping — independent of the UI language. */
  currencyLocale: string;
  /**
   * Path to an approved logo under `public/`.
   *
   * `null` until a client supplies one. A brand mark is a trademark: it is
   * supplied by its owner, never sourced or approximated. The shell falls back
   * to the QuikOps mark, which is always correct and never misrepresents.
   */
  logoPath: string | null;
  /**
   * What the data in this environment actually is, stated on screen.
   *
   * The single most important string in this file. An evaluator who believes
   * they are looking at their own live operation has been misled about the one
   * thing that cannot be corrected afterwards.
   */
  dataDisclosure: string;
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  "sika-evaluation": {
    tenantId: "sika-evaluation",
    tenantName: "Sika",
    environmentLabel: "Sika Evaluation Environment",
    environmentType: "evaluation",
    industry: "Supply Chain / Manufacturing",
    defaultLanguage: "en",
    supportedLanguages: ["en", "es", "pt-BR"],
    currency: "EUR",
    currencyLocale: "de-DE",
    logoPath: null,
    dataDisclosure: "Representative evaluation data — not a live Sika system",
  },
  "perma-demo": {
    tenantId: "perma-demo",
    tenantName: "Perma Construction Aids",
    environmentLabel: "Demo Scenario",
    environmentType: "demo",
    industry: "Construction Chemicals — India",
    defaultLanguage: "en",
    supportedLanguages: ["en", "es"],
    currency: "INR",
    currencyLocale: "en-IN",
    logoPath: null,
    dataDisclosure: "Illustrative demonstration data — a representative scenario, not a customer",
  },
};

/** The tenant this deployment presents. Overridable per environment. */
export const DEFAULT_TENANT_ID: TenantId = "perma-demo";

export function getTenantConfig(tenantId: TenantId = DEFAULT_TENANT_ID): TenantConfig {
  return TENANTS[tenantId];
}

/** True when the id names a tenant that exists — used to reject a stale cookie. */
export function isTenantId(value: string | undefined): value is TenantId {
  return value !== undefined && value in TENANTS;
}

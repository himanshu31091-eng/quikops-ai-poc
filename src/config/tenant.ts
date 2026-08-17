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
  /**
   * Who the Copilot is told it is working for — prompt layer 2's first paragraph.
   *
   * Lives here rather than in the prompt because the prompt had the demo tenant's
   * operator hardcoded, which meant the evaluation environment's Copilot answered
   * as though it ran the *other* company's plants in the other company's currency.
   *
   * Safe for prompt caching: this resolves from `QUIKOPS_TENANT` once at module
   * load, so it is byte-identical across every request in a deployment — which is
   * what the cache prefix requires. Per-*request* interpolation is the thing that
   * would break it.
   */
  copilotOperator: string;
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
    copilotOperator:
      "The operator is Sika, a construction-chemicals and industrial-adhesives manufacturer, running five European plants — Leimen in Germany, Tarragona in Spain, Vila Nova de Gaia in Portugal, Lyon in France and Milano in Italy. The product lines are concrete admixtures, waterproofing membranes, industrial flooring, sealants and adhesives, and repair mortars, sold largely to construction contractors, infrastructure projects and industrial manufacturers. Money is euros.",
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
    copilotOperator:
      "The operator is Perma Construction Aids, an Indian construction-chemicals manufacturer running four plants — Vapi in Gujarat, Roorkee in Uttarakhand, Hyderabad in Telangana and Chennai in Tamil Nadu. The product lines are waterproofing chemicals, concrete admixtures, repair chemicals and tile adhesives, sold largely to construction and infrastructure contractors. Money is Indian rupees, written in lakh and crore.",
  },
};

/** True when the id names a tenant that exists — used to reject a stale cookie. */
export function isTenantId(value: string | undefined): value is TenantId {
  return value !== undefined && value in TENANTS;
}

/**
 * The tenant this deployment presents.
 *
 * Read from the server environment so one build serves either audience: the
 * Sika evaluation environment sets `QUIKOPS_TENANT=sika-evaluation`, and
 * anything else falls back to the demo scenario.
 *
 * **Never read from the browser** — not a header, not a query string, not a
 * cookie. The tenant decides which rows a session may see, so a value the
 * client could choose would be the isolation model handed to whoever opened
 * dev tools. An unrecognised value falls back rather than throwing: a typo in
 * an environment variable should show the demo, not take the portal down.
 */
export const DEFAULT_TENANT_ID: TenantId = isTenantId(process.env.QUIKOPS_TENANT)
  ? process.env.QUIKOPS_TENANT
  : "perma-demo";

export function getTenantConfig(tenantId: TenantId = DEFAULT_TENANT_ID): TenantConfig {
  return TENANTS[tenantId];
}

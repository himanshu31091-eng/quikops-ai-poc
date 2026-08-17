/**
 * Plant-scope vocabulary that both the server and the browser need.
 *
 * Split from the cookie reader because the selector is a client component: one
 * import of a module touching next/headers pulls server-only code into the
 * browser bundle and fails the build. Same split as src/auth/session.ts.
 *
 * `ALL_PLANTS` is a real state, not the absence of one. Portfolio figures and
 * plant figures answer different questions and must never be mixed.
 */
export const PLANT_SCOPE_COOKIE = "qo_plant";
export const ALL_PLANTS = "ALL";

/** `ALL_PLANTS`, or a plant code that exists. An unknown code is not trusted. */
export type PlantScope = string;

/** True when the scope names one plant rather than the whole network. */
export function isPlantScoped(scope: PlantScope): boolean {
  return scope !== ALL_PLANTS;
}

/**
 * The one place a scope is applied to a case list.
 *
 * Every query that honours plant scope calls this, so "what does this filter
 * mean" has a single answer and no screen can implement its own.
 */
export function scopeCases<T extends { plantCode: string }>(
  items: T[],
  scope: PlantScope,
): T[] {
  return isPlantScoped(scope) ? items.filter((item) => item.plantCode === scope) : items;
}

import { cookies } from "next/headers";
import { PLANT_BY_CODE } from "@/src/data/fixtures/organisation";
import { ALL_PLANTS, PLANT_SCOPE_COOKIE, type PlantScope } from "./plant-scope-shared";

export * from "./plant-scope-shared";

/**
 * The plant the user is looking through, read on the server.
 *
 * A cookie rather than client state, for the same reason the persona is one:
 * every figure in this product is computed on the server from the case corpus,
 * so a scope the server cannot read is a scope that cannot change a number. The
 * previous control held its selection in local React state and filtered nothing — it
 * looked like a filter, which is worse than not having one.
 */
export async function getPlantScope(): Promise<PlantScope> {
  const store = await cookies();
  const value = store.get(PLANT_SCOPE_COOKIE)?.value;
  return value && PLANT_BY_CODE[value] ? value : ALL_PLANTS;
}

import { cookies } from "next/headers";
import { getPlants } from "@/src/data/queries/corpus";
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
 *
 * The code is checked against *the tenant's own* sites. Validating it against the
 * fixture map — as both this and `setPlantScope` used to — is what made the
 * control inert in the evaluation tenant: Neon's plant codes are not in the
 * fixtures, so a scope that had been written was discarded on the way back out
 * and every screen fell through to the whole network. Refusing an unknown code is
 * still the point; the tenant's plant list is simply the right thing to refuse it
 * against.
 */
export async function getPlantScope(): Promise<PlantScope> {
  const store = await cookies();
  const value = store.get(PLANT_SCOPE_COOKIE)?.value;
  if (!value || value === ALL_PLANTS) return ALL_PLANTS;

  const plants = await getPlants();
  return plants.some((plant) => plant.code === value) ? value : ALL_PLANTS;
}

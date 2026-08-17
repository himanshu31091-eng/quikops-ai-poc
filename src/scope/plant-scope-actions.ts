"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPlants } from "@/src/data/queries/corpus";
import { ALL_PLANTS, PLANT_SCOPE_COOKIE } from "./plant-scope-shared";

const ONE_DAY_SECONDS = 60 * 60 * 24;

/**
 * Sets the plant scope and revalidates the tree.
 *
 * The revalidate is the whole point: every KPI, chart and table below the
 * layout is server-rendered from the scoped corpus, so the scope changing has
 * to re-run them. Without it the cookie would move and the screen would not,
 * which is the failure this replaced.
 *
 * The code is validated against *the tenant's own* sites, through the same seam
 * the selector was populated from. Checking it against the fixture map is what
 * broke the control in the evaluation tenant: the menu listed Neon's plants,
 * none of their codes existed in the fixtures, so every selection failed
 * validation and returned before writing the cookie. The dropdown opened, the
 * plants were right, and clicking one did nothing at all.
 */
export async function setPlantScope(scope: string): Promise<void> {
  if (scope !== ALL_PLANTS) {
    const plants = await getPlants();
    if (!plants.some((plant) => plant.code === scope)) return;
  }

  const store = await cookies();
  store.set(PLANT_SCOPE_COOKIE, scope, {
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
  });
  revalidatePath("/", "layout");
}
